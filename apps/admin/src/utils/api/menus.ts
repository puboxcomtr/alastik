import { fetchAPI } from '@libs/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'


// Backend'in döndürdüğü açıklayıcı mesajı korur; bağlantı hatasını anlaşılır hale getirir
function menuError(error: any, fallback: string): Error {
    const message = String(error?.message || '')
    if (!message || /failed to fetch|networkerror|load failed/i.test(message)) {
        return new Error('Sunucuya ulaşılamadı, lütfen tekrar deneyin')
    }
    return new Error(message || fallback)
}

export type MenuLinkDataType = {
    url?: string
    categoryId?: string
    categoryLevel?: 1 | 2
    blogCategoryId?: string
    blogCategoryName?: string
    blogCategoryUrl?: string
    pageId?: string
    blogId?: string
    productId?: string
    tagId?: string
    tagTitle?: string
    tagUrl?: string
    brandId?: string
    brandTitle?: string
    brandUrl?: string
}

export type MenuType = {
    _id: string
    name: string
    menuType: 'link' | 'category' | 'blogCategory' | 'page' | 'blog' | 'product' | 'tag' | 'brand' | 'heading'
    linkData: MenuLinkDataType
    openNewTab: boolean
    displayArea: 'header' | 'footer' | 'mobile' | 'general' | 'blog' | 'ustlink'
    icon?: string
    rowLevel: 1 | 2 | 3
    parentId?: string | null
    order: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    children?: MenuType[]
}

export type CategoryOptionType = {
    _id: string
    name: string
    categoryLevel: number
}

export type ProductOptionType = {
    _id: string
    title: string
    sku: string
    slug: string
}

export type BrandOptionType = {
    _id: string
    title: string
    slug: string
    productCount: number
}

export type TagOptionType = {
    _id: string
    title: string
    slug: string
    productCount: number
}

export type BlogOptionType = {
    _id: string
    title: string
    slug: string
}

export type PageOptionType = {
    _id: string
    title: string
    slug: string
}

export type ParentMenuOptionType = {
    _id: string
    name: string
    displayArea: string
    rowLevel?: number
    menuType?: string
}

// Menü listesi
export async function fetchMenus(params?: {
    displayArea?: string
    rowLevel?: number
    isActive?: boolean
}) {
    const queryParams = new URLSearchParams()
    if (params?.displayArea) queryParams.append('displayArea', params.displayArea)
    if (params?.rowLevel) queryParams.append('rowLevel', params.rowLevel.toString())
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())

    try {
        return await fetchAPI(`${API_URL}/admin/design/menu?${queryParams.toString()}`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Menüler yüklenemedi')
    }
}

// Tek menü getir
export async function fetchMenu(id: string) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/${id}`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Menü bulunamadı')
    }
}

// Kategorileri getir (dropdown için)
export async function fetchCategories(level?: 1 | 2) {
    const queryParams = level ? `?level=${level}` : ''

    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/options/categories${queryParams}`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Kategoriler yüklenemedi')
    }
}

// Sayfaları getir (dropdown için)
export async function fetchPages() {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/options/pages`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Sayfalar yüklenemedi')
    }
}

// Blog yazılarını getir (dropdown için)
export async function fetchBlogs() {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/options/blogs`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Blog yazıları yüklenemedi')
    }
}

// Ürünleri ara (katalog büyük olduğundan sunucuda aranır)
export async function fetchProducts(query: string) {
    const q = query ? `?q=${encodeURIComponent(query)}` : ''

    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/options/products${q}`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Ürünler yüklenemedi')
    }
}

// Markaları getir (dropdown için, sunucuda aranır)
export async function fetchBrands(query: string) {
    const q = query ? `?q=${encodeURIComponent(query)}` : ''

    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/options/brands${q}`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Markalar yüklenemedi')
    }
}

// Etiketleri ara (çok sayıda olduğundan sunucuda aranır)
export async function fetchTags(query: string) {
    const q = query ? `?q=${encodeURIComponent(query)}` : ''

    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/options/tags${q}`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Etiketler yüklenemedi')
    }
}

// Ana menüleri getir (alt menü eklerken)
export async function fetchParentMenus(displayArea?: string) {
    const queryParams = displayArea ? `?displayArea=${displayArea}` : ''

    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/options/parent-menus${queryParams}`, {
            cache: 'no-store'
        })
    } catch (error: any) {
        throw menuError(error, 'Ana menüler yüklenemedi')
    }
}

// Yeni menü oluştur
export async function createMenu(data: Partial<MenuType>) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    } catch (error: any) {
        throw menuError(error, 'Menü oluşturulamadı')
    }
}

// Menü güncelle
export async function updateMenu(id: string, data: Partial<MenuType>) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    } catch (error: any) {
        throw menuError(error, 'Menü güncellenemedi')
    }
}

// Sıralamayı toplu güncelle (sürükle-bırak)
export async function updateMenuOrder(items: { id: string; order: number }[]) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/order`, {
            method: 'PATCH',
            body: JSON.stringify({ items })
        })
    } catch (error: any) {
        throw menuError(error, 'Sıralama güncellenemedi')
    }
}

// Menü sil
export async function deleteMenu(id: string) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/${id}`, {
            method: 'DELETE'
        })
    } catch (error: any) {
        // Backend mesajını koru (örn. "Bu menüye bağlı alt menüler var")
        throw menuError(error, 'Menü silinemedi')
    }
}

// Menü grubunu (görüntüleme alanı) topluca sil
export async function deleteMenuArea(area: 'header' | 'footer' | 'mobile') {
    try {
        return await fetchAPI(`${API_URL}/admin/design/menu/area/${area}`, {
            method: 'DELETE'
        })
    } catch (error: any) {
        throw menuError(error, 'Menü silinemedi')
    }
}