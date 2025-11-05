// apps/admin/src/utils/api/admins.ts
import { apiClient } from './apiClient'

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

const apiClientWithAuth = async (endpoint: string, options: any = {}) => {
    const { getSession } = await import('next-auth/react')
    const session = await getSession()
    const token = (session?.user as any)?.accessToken

    const headers = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    }

    return apiClient(endpoint, {
        ...options,
        headers
    })
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

    const endpoint = `/admin/user/admins${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

    return apiClientWithAuth(endpoint, { cache: 'no-store' })
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
    return apiClientWithAuth('/admin/user/admins', {
        method: 'POST',
        body: data
    })
}

export async function updateAdmin(id: string, data: Partial<AdminType>) {
    return apiClientWithAuth(`/admin/user/admins/${id}`, {
        method: 'PUT',
        body: data
    })
}

export async function deleteAdmin(id: string) {
    return apiClientWithAuth(`/admin/user/admins/${id}`, {
        method: 'DELETE'
    })
}