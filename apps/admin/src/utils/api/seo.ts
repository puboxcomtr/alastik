import { getSiteHeader } from '@/utils/activeSite'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
export type SeoHomepageType = {
    title: string
    description: string
    keywords: string
}

export type SeoTemplateType = {
    titleTemplate: string
    descriptionTemplate: string
    keywordsTemplate: string
}

export type SeoSettingsType = {
    _id?: string
    homepage: SeoHomepageType
    category: SeoTemplateType
    brand: SeoTemplateType
    product: SeoTemplateType
    createdAt?: Date
    updatedAt?: Date
}

export async function getSeoSettings() {
    const response = await fetch(`${API_URL}/admin/settings/seo`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('SEO ayarları yüklenemedi')
    }

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.message || 'SEO ayarları alınamadı')
    }

    return result.data as SeoSettingsType
}

export async function updateSeoSettings(data: Partial<SeoSettingsType>) {
    const response = await fetch(`${API_URL}/admin/settings/seo`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getSiteHeader()
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'SEO ayarları güncellenemedi')
    }

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.message || 'SEO ayarları kaydedilemedi')
    }

    return result.data as SeoSettingsType
}