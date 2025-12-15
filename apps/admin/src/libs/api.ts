// src/lib/api.ts

// API Base URL
const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        // Server-side
        return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
    }
    // Client-side
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
}

export const API_ENDPOINTS = {
    products: {
        list: () => `${getBaseUrl()}/admin/products`,
        detail: (id: string) => `${getBaseUrl()}/admin/products/${id}`,
        features: () => `${getBaseUrl()}/admin/products/features/all`,
        sync: (id: string) => `${getBaseUrl()}/admin/products/${id}/synchronization`,
    },
    diaSync: {
        all: () => `${getBaseUrl()}/dia-stock/sync`,
        names: () => `${getBaseUrl()}/dia-stock/sync-names`,
        codes: () => `${getBaseUrl()}/dia-stock/sync-codes`,
        prices: () => `${getBaseUrl()}/dia-stock/sync-prices`,
        images: () => `${getBaseUrl()}/dia-stock/sync-images`,
    }
}

export async function fetchAPI(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    })

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
}