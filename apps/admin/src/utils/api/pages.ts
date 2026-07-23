import { getSiteHeader } from '@/utils/activeSite'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export type PageType = {
    _id: string
    title: string
    slug: string
    content: string
    excerpt?: string
    seo?: {
        metaTitle?: string
        metaDescription?: string
        metaKeywords?: string[]
        ogImage?: string
    }
    status: 'draft' | 'published' | 'archived'
    template: 'default' | 'full-width' | 'landing' | 'contact'
    author?: string
    publishedAt?: Date
    viewCount: number
    createdAt: Date
    updatedAt: Date
}

export async function fetchPages() {
    const response = await fetch(`${API_URL}/admin/pages`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Sayfalar yüklenemedi')
    }

    return response.json()
}

export async function fetchPage(id: string) {
    const response = await fetch(`${API_URL}/admin/pages/${id}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Sayfa bulunamadı')
    }

    return response.json()
}

export async function getPageById(id: string) {
    const response = await fetch(`${API_URL}/admin/pages/${id}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Sayfa bulunamadı')
    }

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.message || 'Sayfa detayı alınamadı')
    }

    return result.data
}

export async function createPage(data: Partial<PageType>) {
    const response = await fetch(`${API_URL}/admin/pages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getSiteHeader()
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Sayfa oluşturulamadı')
    }

    return response.json()
}

export async function updatePage(id: string, data: Partial<PageType>) {
    const response = await fetch(`${API_URL}/admin/pages/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getSiteHeader()
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Sayfa güncellenemedi')
    }

    return response.json()
}

export async function deletePage(id: string) {
    const response = await fetch(`${API_URL}/admin/pages/${id}`, {
        method: 'DELETE',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Sayfa silinemedi')
    }

    return response.json()
}