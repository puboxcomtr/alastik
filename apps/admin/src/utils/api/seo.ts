import { fetchAPI } from '@libs/api'

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
    other?: Record<string, any>
    analysis?: Record<string, any>
    createdAt?: Date
    updatedAt?: Date
}

export async function getSeoSettings() {
    let result: any

    try {
        result = await fetchAPI(`${API_URL}/admin/settings/seo`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('SEO ayarları yüklenemedi')
    }

    if (!result.success) {
        throw new Error(result.message || 'SEO ayarları alınamadı')
    }

    return result.data as SeoSettingsType
}

export async function updateSeoSettings(data: Partial<SeoSettingsType>) {
    let result: any

    try {
        result = await fetchAPI(`${API_URL}/admin/settings/seo`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    } catch {
        throw new Error('SEO ayarları güncellenemedi')
    }

    if (!result.success) {
        throw new Error(result.message || 'SEO ayarları kaydedilemedi')
    }

    return result.data as SeoSettingsType
}