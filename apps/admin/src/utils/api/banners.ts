const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

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

    const response = await fetch(`${API_URL}/admin/design/banners?${queryParams.toString()}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Bannerlar yüklenemedi')
    }

    return response.json()
}

export async function fetchBanner(id: string) {
    const response = await fetch(`${API_URL}/admin/design/banners/${id}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Banner bulunamadı')
    }

    return response.json()
}

export async function createBanner(formData: FormData) {
    const response = await fetch(`${API_URL}/admin/design/banners`, {
        method: 'POST',
        body: formData
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Banner oluşturulamadı')
    }

    return response.json()
}

export async function updateBanner(id: string, formData: FormData) {
    const response = await fetch(`${API_URL}/admin/design/banners/${id}`, {
        method: 'PUT',
        body: formData
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Banner güncellenemedi')
    }

    return response.json()
}

export async function deleteBanner(id: string) {
    const response = await fetch(`${API_URL}/admin/design/banners/${id}`, {
        method: 'DELETE'
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Banner silinemedi')
    }

    return response.json()
}