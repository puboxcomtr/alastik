import { fetchAPI } from '@libs/api'

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
    try {
        return await fetchAPI(`${API_URL}/admin/pages`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('Sayfalar yüklenemedi')
    }
}

export async function fetchPage(id: string) {
    try {
        return await fetchAPI(`${API_URL}/admin/pages/${id}`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('Sayfa bulunamadı')
    }
}

export async function getPageById(id: string) {
    let result: any

    try {
        result = await fetchAPI(`${API_URL}/admin/pages/${id}`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('Sayfa bulunamadı')
    }

    if (!result.success) {
        throw new Error(result.message || 'Sayfa detayı alınamadı')
    }

    return result.data
}

export async function createPage(data: Partial<PageType>) {
    try {
        return await fetchAPI(`${API_URL}/admin/pages`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    } catch {
        throw new Error('Sayfa oluşturulamadı')
    }
}

export async function updatePage(id: string, data: Partial<PageType>) {
    try {
        return await fetchAPI(`${API_URL}/admin/pages/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    } catch {
        throw new Error('Sayfa güncellenemedi')
    }
}

export async function deletePage(id: string) {
    try {
        return await fetchAPI(`${API_URL}/admin/pages/${id}`, {
            method: 'DELETE'
        })
    } catch {
        throw new Error('Sayfa silinemedi')
    }
}