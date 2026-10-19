import { apiClient } from './apiClient'

export type BlogCategoryType = {
    _id: string
    site?: string
    name: string
    slug: string
    description?: string
    order: number
    status: 'active' | 'passive'
    cardImageRatio?: 'square' | 'portrait' | 'landscape'
    seo?: {
        title?: string
        description?: string
    }
    createdAt?: string
    updatedAt?: string
}

export async function fetchBlogCategories() {
    return apiClient('/admin/blog-kategoriler', { cache: 'no-store' })
}

export async function getBlogCategory(id: string) {
    return apiClient(`/admin/blog-kategoriler/${id}`, { cache: 'no-store' })
}

export async function createBlogCategory(data: Partial<BlogCategoryType>) {
    return apiClient('/admin/blog-kategoriler', { method: 'POST', body: data })
}

export async function updateBlogCategory(id: string, data: Partial<BlogCategoryType>) {
    return apiClient(`/admin/blog-kategoriler/${id}`, { method: 'PUT', body: data })
}

export async function deleteBlogCategory(id: string) {
    return apiClient(`/admin/blog-kategoriler/${id}`, { method: 'DELETE' })
}
