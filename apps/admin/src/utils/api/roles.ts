const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export type RoleType = {
    _id: string
    name: string
    description?: string
    permissions: Array<{
        module: string
        view: boolean
        create: boolean
        edit: boolean
        delete: boolean
        sync: boolean
    }>
    isSystem: boolean
    status: 'active' | 'inactive'
    userCount?: number
    createdAt: Date
    updatedAt: Date
}

export type ModuleDefinition = {
    key: string
    name: string
    category: string
    actions: string[]
}

export type ModulesByCategory = {
    [category: string]: ModuleDefinition[]
}

// Token'ı localStorage'dan al
const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    }
    return null
}

// Ortak fetch fonksiyonu
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    // next-auth session'ından token almak için
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

export async function deleteRole(id: string) {
    return fetchWithAuth(`${API_URL}/admin/user/roles/${id}`, {
        method: 'DELETE'
    })
}

export async function fetchModules() {
    return fetchWithAuth(`${API_URL}/admin/user/roles/modules`, {
        cache: 'no-store'
    })
}

export async function fetchRoles(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: string
}) {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const url = `${API_URL}/admin/user/roles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

    return fetchWithAuth(url, {
        cache: 'no-store'
    })
}

export async function fetchRole(id: string) {
    return fetchWithAuth(`${API_URL}/admin/user/roles/${id}`, {
        cache: 'no-store'
    })
}

export async function createRole(data: {
    name: string
    description?: string
    permissions: Array<{
        module: string
        view?: boolean
        create?: boolean
        edit?: boolean
        delete?: boolean
        sync?: boolean
    }>
    status?: 'active' | 'inactive'
}) {
    return fetchWithAuth(`${API_URL}/admin/user/roles`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
}

export async function updateRole(id: string, data: Partial<RoleType>) {
    return fetchWithAuth(`${API_URL}/admin/user/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    })
}
