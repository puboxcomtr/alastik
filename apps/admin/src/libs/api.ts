// src/lib/api.ts
import { getSession } from 'next-auth/react'

// MEDIA
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082'


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
        update: (id: string) => `${getBaseUrl()}/admin/products/${id}`,
        features: () => `${getBaseUrl()}/admin/products/features/all`,
        sync: (id: string) => `${getBaseUrl()}/admin/products/${id}/synchronization`,
    },
    brands: {
        list: () => `${getBaseUrl()}/admin/brands`,
        detail: (id: string) => `${getBaseUrl()}/admin/brands/${id}`,
    },
    categories: {
        list: () => `${getBaseUrl()}/admin/categories`,
        detail: (id: string) => `${getBaseUrl()}/admin/categories/${id}`,
    },
    labels: {
        list: () => `${getBaseUrl()}/admin/tags`,
        detail: (id: string) => `${getBaseUrl()}/admin/tags/${id}`,
    },
    championships: {
        list: () => `${getBaseUrl()}/admin/championships`,
        product: (productKey: string) => `${getBaseUrl()}/admin/championships/product/${productKey}`,
        assign: (id: string) => `${getBaseUrl()}/admin/championships/${id}/assign`,
        unassign: (id: string) => `${getBaseUrl()}/admin/championships/${id}/unassign`,
    },
    features: {
        list: () => `${getBaseUrl()}/admin/features`,
        detail: (id: string) => `${getBaseUrl()}/admin/features/${id}`,
    },
    orders: {
        list: () => `${getBaseUrl()}/admin/orders`,
        detail: (id: string) => `${getBaseUrl()}/admin/orders/${id}`,
        updateStatus: (id: string) => `${getBaseUrl()}/admin/orders/${id}/status`,
        updatePaymentStatus: (id: string) => `${getBaseUrl()}/admin/orders/${id}/payment-status`,
    },
    webxml: {
        list: () => `${getBaseUrl()}/admin/integration/xml`,
        detail: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}`,
        update: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}`,
        updateStatus: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/status`,
        startSync: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/sync`,
        updateRules: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/rules`,
        getFilterOptions: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/filter-options`,
        getDiaFields: () => `${getBaseUrl()}/admin/integration/xml/dia-fields`,
        syncToDia: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/sync-to-dia`,
        xmlProducts: (source: string) => `${getBaseUrl()}/admin/integration/xml/products?source=${source}`,
        exportExcel: () => `${getBaseUrl()}/admin/integration/xml/export-excel`,
        downloadExcel: (fileName: string) => `${getBaseUrl()}/admin/integration/xml/export-excel/download/${fileName}`,
    },
    admins: {
        list: () => `${getBaseUrl()}/admin/user/admins`,
        create: () => `${getBaseUrl()}/admin/user/admins`,
        detail: (id: string) => `${getBaseUrl()}/admin/user/admins/${id}`,
        update: (id: string) => `${getBaseUrl()}/admin/user/admins/${id}`,
        delete: (id: string) => `${getBaseUrl()}/admin/user/admins/${id}`,
    },
    showcases: {
        list: () => `${getBaseUrl()}/admin/showcases`,
        detail: (id: string) => `${getBaseUrl()}/admin/showcases/${id}`,
    },
    roles: {
        list: () => `${getBaseUrl()}/admin/user/roles`,
        create: () => `${getBaseUrl()}/admin/user/roles`,
        detail: (id: string) => `${getBaseUrl()}/admin/user/roles/${id}`,
        update: (id: string) => `${getBaseUrl()}/admin/user/roles/${id}`,
        delete: (id: string) => `${getBaseUrl()}/admin/user/roles/${id}`,
    },
    diaSync: {
        fullSync: () => `${getBaseUrl()}/dia/full-sync`,
        lightSync: () => `${getBaseUrl()}/dia/sync/prices-and-stocks`,
        syncStatus: () => `${getBaseUrl()}/dia/sync/status`,
        syncStats: () => `${getBaseUrl()}/dia/sync/stats`,
        jobProgress: (jobId: string, type: string) => `${getBaseUrl()}/dia/sync/job/${jobId}/progress?type=${type}`,
    },
    diaSettings: {
        get: () => `${getBaseUrl()}/admin/modules/dia/settings`,
        update: () => `${getBaseUrl()}/admin/modules/dia/settings`,
        testConnection: () => `${getBaseUrl()}/admin/modules/dia/test-connection`,
        fullSync: () => `${getBaseUrl()}/dia/full-sync`,
    }
}
export async function fetchAPI(url: string, options?: RequestInit) {
    let token: string | undefined
    if (typeof window !== 'undefined') {
        const session = await getSession()
        token = session?.user?.accessToken
    }

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options?.headers,
        },
        ...options,
    })

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
}

/* Helper - Image URL */
export function getImageUrl(path?: string): string {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return `${MEDIA_URL}${path.startsWith('/') ? path : '/' + path}`
}
export async function getThemeSettings() {
    try {
        const response = await fetchAPI(`${getBaseUrl()}/admin/design/settings/theme`)
        return response
    } catch {
        return null
    }
}
export async function getSiteName(): Promise<string> {
    try {
        const response = await fetchAPI(`${getBaseUrl()}/admin/settings/general`)
        return response?.data?.companyInfo?.name || 'A Lastik'
    } catch {
        return 'A Lastik'
    }
}