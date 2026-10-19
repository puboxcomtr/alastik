import { getSession } from 'next-auth/react'

import { getSiteHeader } from '@/utils/activeSite'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

interface FetchOptions extends RequestInit {
    body?: any
}

export async function apiClient<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    let token: string | undefined

    if (typeof window !== 'undefined') {
        const session = await getSession()

        token = session?.user?.accessToken
    }

    const { headers, body, ...rest } = options
    const isFormData = body instanceof FormData

    const config: RequestInit = {
        credentials: 'include',
        ...rest,
        headers: {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...getSiteHeader(),
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...headers
        }
    }

    if (body !== undefined) {
        config.body = isFormData || typeof body === 'string' ? body : JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }))

        throw new Error(error.message || 'İstek başarısız')
    }

    return response.json()
}
