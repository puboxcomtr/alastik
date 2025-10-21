// apps/admin/src/utils/api/admins.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export type AdminType = {
    _id: string
    name: string
    email: string
    role: {
        _id: string
        name: string
    }
    isActive: boolean
    avatar?: string
    lastLogin?: Date
    status: 'active' | 'inactive' | 'blocked'
    createdAt: Date
    updatedAt: Date
}

// Session token'ı al
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const { getSession } = await import('next-auth/react')
    const session = await getSession()
    const token = (session?.user as any)?.accessToken

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    }

    const response = await fetch(url, {
        ...options,
        headers
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }))
        throw new Error(error.message || 'İşlem başarısız')
    }

    return response.json()
}

export async function fetchAdmins(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    role?: string
    sortBy?: string
    sortOrder?: string
}) {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.role) queryParams.append('role', params.role)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const url = `${API_URL}/admin/user/admins${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

    return fetchWithAuth(url, { cache: 'no-store' })
}

export async function createAdmin(data: {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
    role: string
    permissions?: string[]
    status?: 'active' | 'inactive'
}) {
    return fetchWithAuth(`${API_URL}/admin/user/admins`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
}

export async function updateAdmin(id: string, data: Partial<AdminType>) {
    return fetchWithAuth(`${API_URL}/admin/user/admins/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    })
}

export async function deleteAdmin(id: string) {
    return fetchWithAuth(`${API_URL}/admin/user/admins/${id}`, {
        method: 'DELETE'
    })
}