import { getSiteHeader } from '@/utils/activeSite'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export type MenuLinkDataType = {
    url?: string
    categoryId?: string
    categoryLevel?: 1 | 2
    pageId?: string
}

export type MenuType = {
    _id: string
    name: string
    menuType: 'link' | 'category' | 'page'
    linkData: MenuLinkDataType
    openNewTab: boolean
    displayArea: 'header' | 'footer' | 'mobile'
    rowLevel: 1 | 2
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

export type PageOptionType = {
    _id: string
    title: string
    slug: string
}

export type ParentMenuOptionType = {
    _id: string
    name: string
    displayArea: string
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

    const response = await fetch(`${API_URL}/admin/design/menu?${queryParams.toString()}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Menüler yüklenemedi')
    }

    return response.json()
}

// Tek menü getir
export async function fetchMenu(id: string) {
    const response = await fetch(`${API_URL}/admin/design/menu/${id}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Menü bulunamadı')
    }

    return response.json()
}

// Kategorileri getir (dropdown için)
export async function fetchCategories(level?: 1 | 2) {
    const queryParams = level ? `?level=${level}` : ''
    const response = await fetch(`${API_URL}/admin/design/menu/options/categories${queryParams}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Kategoriler yüklenemedi')
    }

    return response.json()
}

// Sayfaları getir (dropdown için)
export async function fetchPages() {
    const response = await fetch(`${API_URL}/admin/design/menu/options/pages`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Sayfalar yüklenemedi')
    }

    return response.json()
}

// Ana menüleri getir (alt menü eklerken)
export async function fetchParentMenus(displayArea?: string) {
    const queryParams = displayArea ? `?displayArea=${displayArea}` : ''
    const response = await fetch(`${API_URL}/admin/design/menu/options/parent-menus${queryParams}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        throw new Error('Ana menüler yüklenemedi')
    }

    return response.json()
}

// Yeni menü oluştur
export async function createMenu(data: Partial<MenuType>) {
    const response = await fetch(`${API_URL}/admin/design/menu`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getSiteHeader()
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Menü oluşturulamadı')
    }

    return response.json()
}

// Menü güncelle
export async function updateMenu(id: string, data: Partial<MenuType>) {
    const response = await fetch(`${API_URL}/admin/design/menu/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getSiteHeader()
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Menü güncellenemedi')
    }

    return response.json()
}

// Menü sil
export async function deleteMenu(id: string) {
    const response = await fetch(`${API_URL}/admin/design/menu/${id}`, {
        method: 'DELETE',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Menü silinemedi')
    }

    return response.json()
}