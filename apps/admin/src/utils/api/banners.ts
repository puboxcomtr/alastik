import { fetchAPI } from '@libs/api'

import { apiClient } from './apiClient'

export type BannerType = {
    _id: string
    description: string
    redirectUrl?: string
    altTag?: string
    status: 'active' | 'inactive'
    openNewTab: boolean
    image: string
    variableKey: string
    order: number
    createdAt: Date
    updatedAt: Date
}

export async function fetchBanners(params?: {
    status?: 'active' | 'inactive'
}) {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)

    return apiClient(`/admin/design/banners?${queryParams.toString()}`, {
        cache: 'no-store'
    })
}

export async function fetchBanner(id: string) {
    return apiClient(`/admin/design/banners/${id}`, {
        cache: 'no-store'
    })
}

export async function createBanner(formData: FormData) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    try {
        return await fetchAPI(`${API_URL}/admin/design/banners`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        })
    } catch {
        throw new Error('Banner oluşturulamadı')
    }
}

export async function updateBanner(id: string, formData: FormData) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    try {
        return await fetchAPI(`${API_URL}/admin/design/banners/${id}`, {
            method: 'PUT',
            credentials: 'include',
            body: formData
        })
    } catch {
        throw new Error('Banner güncellenemedi')
    }
}

export async function deleteBanner(id: string) {
    return apiClient(`/admin/design/banners/${id}`, {
        method: 'DELETE'
    })
}