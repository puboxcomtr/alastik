const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

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
    author?: string
    publishedAt?: Date
    viewCount: number
    createdAt: Date
    updatedAt: Date
}

export async function fetchBlogs() {
    const response = await fetch(`${API_URL}/admin/blogs`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Bloglar yüklenemedi')
    }

    return response.json()
}

export async function fetchBlog(id: string) {
    const response = await fetch(`${API_URL}/admin/blogs/${id}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Blog bulunamadı')
    }

    return response.json()
}

export async function getBlogById(id: string) {
    const response = await fetch(`${API_URL}/admin/blogs/${id}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Blog bulunamadı')
    }

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.message || 'Blog detayı alınamadı')
    }

    return result.data
}

export async function createBlog(data: Partial<BlogType>) {
    const response = await fetch(`${API_URL}/admin/blogs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Blog oluşturulamadı')
    }

    return response.json()
}

export async function updateBlog(id: string, data: Partial<BlogType>) {
    const response = await fetch(`${API_URL}/admin/blogs/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Blog güncellenemedi')
    }

    return response.json()
}

export async function deleteBlog(id: string) {
    const response = await fetch(`${API_URL}/admin/blogs/${id}`, {
        method: 'DELETE'
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Blog silinemedi')
    }

    return response.json()
}