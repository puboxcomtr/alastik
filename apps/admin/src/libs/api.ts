// src/lib/api.ts
import { getSession } from 'next-auth/react'
import { getSiteHeader, getSiteMediaUrl } from '@/utils/activeSite'

// MEDIA
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082'

// API Base URL
const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
}

export const API_ENDPOINTS = {
    products: {
        list: () => `${getBaseUrl()}/admin/products`,
        detail: (id: string) => `${getBaseUrl()}/admin/products/${id}`,
        update: (id: string) => `${getBaseUrl()}/admin/products/${id}`,
        features: () => `${getBaseUrl()}/admin/products/features/all`,
        sync: (id: string) => `${getBaseUrl()}/admin/products/${id}/synchronization`,
        reorderLabelImages: () => `${getBaseUrl()}/admin/products/images/reorder-labels`,
    },
    brands: {
        list: () => `${getBaseUrl()}/admin/brands`,
        detail: (id: string) => `${getBaseUrl()}/admin/brands/${id}`,
    },
    categories: {
        list: () => `${getBaseUrl()}/admin/categories`,
        detail: (id: string) => `${getBaseUrl()}/admin/categories/${id}`,
        filterOptions: () => `${getBaseUrl()}/admin/categories/filter-options`,
    },
    labels: {
        list: () => `${getBaseUrl()}/admin/tags`,
        detail: (id: string) => `${getBaseUrl()}/admin/tags/${id}`,
        manualSync: () => `${getBaseUrl()}/admin/tags/sync/manual-sync`,
    },
    dashboard: {
        ecommerce: () => `${getBaseUrl()}/admin/dashboard/ecommerce`,
    },
    montage: {
        list: () => `${getBaseUrl()}/admin/montage`,
        detail: (id: string) => `${getBaseUrl()}/admin/montage/${id}`,
        create: () => `${getBaseUrl()}/admin/montage`,
        update: (id: string) => `${getBaseUrl()}/admin/montage/${id}`,
        toggle: (id: string) => `${getBaseUrl()}/admin/montage/${id}/toggle`,
        delete: (id: string) => `${getBaseUrl()}/admin/montage/${id}`,
        upload: () => `${getBaseUrl()}/admin/montage/upload`,
        uploadDocument: () => `${getBaseUrl()}/admin/montage/upload-document`,
        documentFile: (fileUrl: string) => `${getBaseUrl()}/admin/montage/document-file?file=${encodeURIComponent(fileUrl)}`,
        serviceProducts: () => `${getBaseUrl()}/admin/montage/service-products`,
        importTemplate: () => `${getBaseUrl()}/admin/montage/import/template`,
        import: (confirm?: boolean) => `${getBaseUrl()}/admin/montage/import${confirm ? '?confirm=1' : ''}`,
    },
    location: {
        cities: () => `${getBaseUrl()}/location/cities`,
        districts: (cityId: string) => `${getBaseUrl()}/location/districts/${cityId}`,
    },
    mailManagement: {
        list: () => `${getBaseUrl()}/admin/mail-management`,
        detail: (id: string) => `${getBaseUrl()}/admin/mail-management/${id}`,
        create: () => `${getBaseUrl()}/admin/mail-management`,
        update: (id: string) => `${getBaseUrl()}/admin/mail-management/${id}`,
        delete: (id: string) => `${getBaseUrl()}/admin/mail-management/${id}`,
        send: (id: string) => `${getBaseUrl()}/admin/mail-management/${id}/send`,
        groups: () => `${getBaseUrl()}/admin/mail-management/groups`,
        users: () => `${getBaseUrl()}/admin/mail-management/users`,
    },
    mailAccounts: {
        list: () => `${getBaseUrl()}/admin/mail-accounts`,
        detail: (id: string) => `${getBaseUrl()}/admin/mail-accounts/${id}`,
        create: () => `${getBaseUrl()}/admin/mail-accounts`,
        update: (id: string) => `${getBaseUrl()}/admin/mail-accounts/${id}`,
        test: (id: string) => `${getBaseUrl()}/admin/mail-accounts/${id}/test`,
    },
    mailTemplates: {
        list: () => `${getBaseUrl()}/admin/mail-templates`,
        detail: (id: string) => `${getBaseUrl()}/admin/mail-templates/${id}`,
        update: (id: string) => `${getBaseUrl()}/admin/mail-templates/${id}`,
        reset: (id: string) => `${getBaseUrl()}/admin/mail-templates/${id}/reset`,
        preview: (id: string) => `${getBaseUrl()}/admin/mail-templates/${id}/preview`,
    },
    generalSettings: {
        get: () => `${getBaseUrl()}/admin/settings/general`,
        upload: () => `${getBaseUrl()}/admin/settings/general/upload`,
        deleteImage: (type: string) => `${getBaseUrl()}/admin/settings/general/image/${type}`,
    },
    smtpSettings: {
        get: () => `${getBaseUrl()}/admin/smtp-settings`,
        update: () => `${getBaseUrl()}/admin/smtp-settings`,
        test: () => `${getBaseUrl()}/admin/smtp-settings/test`,
    },
    championships: {
        list: () => `${getBaseUrl()}/admin/championships`,
        product: (productKey: string) => `${getBaseUrl()}/admin/championships/product/${productKey}`,
        assign: (id: string) => `${getBaseUrl()}/admin/championships/${id}/assign`,
        unassign: (id: string) => `${getBaseUrl()}/admin/championships/${id}/unassign`,
    },
    filters: {
        productOptions: () => `${getBaseUrl()}/admin/filters/product-options`,
        subCategories: (mainCategory: string) => `${getBaseUrl()}/admin/filters/sub-categories?main_category=${encodeURIComponent(mainCategory)}`,
    },
    descriptionTemplates: {
        list: () => `${getBaseUrl()}/admin/description-templates`,
        detail: (id: string) => `${getBaseUrl()}/admin/description-templates/${id}`,
        create: () => `${getBaseUrl()}/admin/description-templates`,
        update: (id: string) => `${getBaseUrl()}/admin/description-templates/${id}`,
        delete: (id: string) => `${getBaseUrl()}/admin/description-templates/${id}`,
        apply: (id: string) => `${getBaseUrl()}/admin/description-templates/${id}/apply`,
        applyAll: () => `${getBaseUrl()}/admin/description-templates/apply-all`,
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
        verifyPayment: (id: string) => `${getBaseUrl()}/admin/orders/${id}/verify-payment`,
        syncDia: (id: string) => `${getBaseUrl()}/admin/orders/${id}/sync-dia`,
        manualCollection: (id: string) => `${getBaseUrl()}/admin/orders/${id}/manual-collection`,
        adminNote: (id: string) => `${getBaseUrl()}/admin/orders/${id}/admin-note`,
        noteTemplates: () => `${getBaseUrl()}/admin/orders/templates/notes`,
    },
    webxml: {
        list: () => `${getBaseUrl()}/admin/integration/xml`,
        create: () => `${getBaseUrl()}/admin/integration/xml`,
        detail: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}`,
        update: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}`,
        updateStatus: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/status`,
        startSync: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/sync`,
        updateRules: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/rules`,
        getFilterOptions: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/filter-options`,
        getSourceFields: (id: string) => `${getBaseUrl()}/admin/integration/xml/${id}/source-fields`,
        xmlProducts: (source: string) => `${getBaseUrl()}/admin/integration/xml/products?source=${source}`,
        allProducts: () => `${getBaseUrl()}/admin/integration/xml/all-products`,
        productsExport: (source?: string) => `${getBaseUrl()}/admin/integration/xml/products/export${source ? `?source=${source}` : ''}`,
        mappingExport: (source?: string) => `${getBaseUrl()}/admin/integration/xml/mapping/export${source ? `?source=${source}` : ''}`,
        mappingImport: () => `${getBaseUrl()}/admin/integration/xml/mapping/import`,
        mappingDelete: (productId: string) => `${getBaseUrl()}/admin/integration/xml/mapping/${productId}`,
        pricingRules: () => `${getBaseUrl()}/admin/integration/xml/pricing/rules`,
        pricingRulesAdd: () => `${getBaseUrl()}/admin/integration/xml/pricing/rules`,
        pricingRulesDelete: (id: string) => `${getBaseUrl()}/admin/integration/xml/pricing/rules/${id}`,
        webSyncFull: () => `${getBaseUrl()}/admin/integration/xml/web-sync/full`,
        webSyncQuick: () => `${getBaseUrl()}/admin/integration/xml/web-sync/quick`,
        syncAll: () => `${getBaseUrl()}/admin/integration/xml/sync-all`,
    },
    admins: {
        list: () => `${getBaseUrl()}/admin/user/admins`,
        create: () => `${getBaseUrl()}/admin/user/admins`,
        detail: (id: string) => `${getBaseUrl()}/admin/user/admins/${id}`,
        update: (id: string) => `${getBaseUrl()}/admin/user/admins/${id}`,
        delete: (id: string) => `${getBaseUrl()}/admin/user/admins/${id}`,
    },
    cargo: {
        list: () => `${getBaseUrl()}/admin/cargo`,
        detail: (id: string) => `${getBaseUrl()}/admin/cargo/${id}`,
        create: () => `${getBaseUrl()}/admin/cargo`,
        update: (id: string) => `${getBaseUrl()}/admin/cargo/${id}`,
        sizes: (params: { categoryId?: string; brandId?: string }) => `${getBaseUrl()}/admin/cargo/sizes?${new URLSearchParams(params as Record<string, string>)}`,
        brands: () => `${getBaseUrl()}/admin/cargo/brands`,
        products: (search: string) => `${getBaseUrl()}/admin/cargo/products?search=${encodeURIComponent(search)}`,
        toggleStatus: (id: string) => `${getBaseUrl()}/admin/cargo/${id}/status`,
        delete: (id: string) => `${getBaseUrl()}/admin/cargo/${id}`,
    },
    showcases: {
        list: () => `${getBaseUrl()}/admin/showcases`,
        detail: (id: string) => `${getBaseUrl()}/admin/showcases/${id}`,
        toggle: (id: string) => `${getBaseUrl()}/admin/showcases/${id}/toggle`,
    },
    blogs: {
        list: () => `${getBaseUrl()}/admin/blogs`,
        detail: (id: string) => `${getBaseUrl()}/admin/blogs/${id}`,
        image: (id: string) => `${getBaseUrl()}/admin/blogs/${id}/image`,
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
        siparisOptions: () => `${getBaseUrl()}/admin/modules/dia/siparis-options`,
        aktarimProducts: (search: string) => `${getBaseUrl()}/admin/modules/dia/aktarim/products?search=${encodeURIComponent(search)}`,
        aktarimCategories: () => `${getBaseUrl()}/admin/modules/dia/aktarim/categories`,
        aktarimBrands: () => `${getBaseUrl()}/admin/modules/dia/aktarim/brands`,
        fullSync: () => `${getBaseUrl()}/dia/full-sync`,
    },
    merchantSettings: {
        get: () => `${getBaseUrl()}/admin/modules/merchant`,
        update: () => `${getBaseUrl()}/admin/modules/merchant`,
        priceFields: () => `${getBaseUrl()}/admin/modules/merchant/price-fields`,
        textFields: () => `${getBaseUrl()}/admin/modules/merchant/text-fields`,
    },
    akakceSettings: {
        get: () => `${getBaseUrl()}/admin/modules/akakce`,
        update: () => `${getBaseUrl()}/admin/modules/akakce`,
        priceFields: () => `${getBaseUrl()}/admin/modules/akakce/price-fields`,
        textFields: () => `${getBaseUrl()}/admin/modules/akakce/text-fields`,
        feedUrl: () => `${getBaseUrl()}/admin/modules/akakce/feed`,
        importProducts: () => `${getBaseUrl()}/admin/modules/akakce/import-products`,
    },
    purchaseLimits: {
        list: () => `${getBaseUrl()}/admin/campaign/purchase-limits`,
        detail: (id: string) => `${getBaseUrl()}/admin/campaign/purchase-limits/${id}`,
        create: () => `${getBaseUrl()}/admin/campaign/purchase-limits`,
        update: (id: string) => `${getBaseUrl()}/admin/campaign/purchase-limits/${id}`,
        delete: (id: string) => `${getBaseUrl()}/admin/campaign/purchase-limits/${id}`,
        toggle: (id: string) => `${getBaseUrl()}/admin/campaign/purchase-limits/${id}/toggle`,
    },
    media: {
        list: (params: {
            folder: string
            search?: string
            page?: number
            limit?: number
            sortBy?: string
            sortOrder?: string
            productCategory?: string
            dekupe?: string
        }) => {
            const query = new URLSearchParams({
                folder: params.folder,
                search: params.search || '',
                page: (params.page || 1).toString(),
                limit: (params.limit || 24).toString(),
                sortBy: params.sortBy || 'date',
                sortOrder: params.sortOrder || 'desc',
                productCategory: params.productCategory || '',
                dekupe: params.dekupe || ''
            })
            return `${getBaseUrl()}/admin/media/list?${query}`
        },
        upload: (folder: string) => `${getBaseUrl()}/admin/media/upload?folder=${folder}`,
        folders: () => `${getBaseUrl()}/admin/media/folders`,
        delete: (fileId: string) => `${getBaseUrl()}/admin/media/${encodeURIComponent(fileId)}`,
        updateMeta: () => `${getBaseUrl()}/admin/media/meta`,
        removeBackground: () => `${getBaseUrl()}/admin/media/remove-background`,
        restoreOriginal: () => `${getBaseUrl()}/admin/media/restore-original`,
        restoreOriginalBulk: () => `${getBaseUrl()}/admin/media/restore-original-bulk`,
    },
    redirects: {
        list: (params: { search?: string; page?: number; limit?: number }) => {
            const query = new URLSearchParams({
                search: params.search || '',
                page: (params.page || 1).toString(),
                limit: (params.limit || 50).toString()
            })
            return `${getBaseUrl()}/admin/redirects?${query}`
        },
        create: () => `${getBaseUrl()}/admin/redirects`,
        update: (id: string) => `${getBaseUrl()}/admin/redirects/${id}`,
        delete: (id: string) => `${getBaseUrl()}/admin/redirects/${id}`,
        import: () => `${getBaseUrl()}/admin/redirects/import`,
    },
    members: {
        list: (params: { search?: string; status?: string; page?: number; limit?: number }) => {
            const query = new URLSearchParams({
                search: params.search || '',
                status: params.status || '',
                page: (params.page || 1).toString(),
                limit: (params.limit || 100).toString()
            })
            return `${getBaseUrl()}/admin/members?${query}`
        },
    },
}

export async function fetchAPI(url: string, options?: RequestInit) {
    let token: string | undefined
    if (typeof window !== 'undefined') {
        const session = await getSession()
        token = session?.user?.accessToken
    }

    const isFormData = options?.body instanceof FormData

    // options en basta yayilir; headers en sonda birlestirilir ki
    // cagiran tarafin verdigi ozel header'lar token ve X-Site'i ezmesin
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...getSiteHeader(),
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options?.headers,
        },
    })

    if (!response.ok) {
        // Backend'in döndürdüğü açıklayıcı mesajı koru (örn. "Bu menü sitede kullanılıyor")
        let message = `API Error: ${response.statusText}`
        try {
            const body = await response.json()
            if (body?.message) message = body.message
        } catch { }
        throw new Error(message)
    }

    return response.json()
}

export function getImageUrl(path?: string): string {
    if (!path) return ''
    if (path.startsWith('http')) return path
    // Panelde secili siteye gore medya alan adi kullanilir
    const base = getSiteMediaUrl() || MEDIA_URL
    return `${base}${path.startsWith('/') ? path : '/' + path}`
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