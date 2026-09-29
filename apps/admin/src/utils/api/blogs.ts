// apps/admin/src/utils/api/blogs.ts
import { apiClient } from './apiClient'

export type BlogType = {
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
    featuredImage?: string
    categories?: string[]
    author?: string
    publishedAt?: Date
    viewCount: number
    createdAt: Date
    updatedAt: Date
}

export async function fetchBlogs() {
    return apiClient('/admin/blogs', {
        cache: 'no-store'
    })
}

export async function fetchBlog(id: string) {
    return apiClient(`/admin/blogs/${id}`, {
        cache: 'no-store'
    })
}

export async function getBlogById(id: string) {
    const result = await apiClient(`/admin/blogs/${id}`, {
        cache: 'no-store'
    })

    if (!result.success) {
        throw new Error(result.message || 'Blog detayı alınamadı')
    }

    return result.data
}

export async function createBlog(data: Partial<BlogType>) {
    return apiClient('/admin/blogs', {
        method: 'POST',
        body: data
    })
}

export async function updateBlog(id: string, data: Partial<BlogType>) {
    return apiClient(`/admin/blogs/${id}`, {
        method: 'PUT',
        body: data
    })
}

export async function deleteBlog(id: string) {
    return apiClient(`/admin/blogs/${id}`, {
        method: 'DELETE'
    })
}