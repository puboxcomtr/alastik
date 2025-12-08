const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

interface FetchOptions extends RequestInit {
    body?: any
}

export async function apiClient(endpoint: string, options: FetchOptions = {}) {
    const config: RequestInit = {
        credentials: 'include', 
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    }

    // Body varsa JSON'a çevir
    if (options.body && typeof options.body !== 'string') {
        config.body = JSON.stringify(options.body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }))
        throw new Error(error.message || 'İstek başarısız')
    }

    return response.json()
}