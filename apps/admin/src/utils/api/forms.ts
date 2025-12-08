import { apiClient } from './apiClient'

export type FormType = {
    _id: string
    formType: 'contact' | 'quote' | 'support' | 'newsletter' | 'custom'
    name: string
    email: string
    phone?: string
    company?: string
    subject?: string
    message: string
    sourceUrl: string
    referrerUrl?: string
    userAgent?: string
    ipAddress?: string
    extraData?: Record<string, string>
    status: 'new' | 'read' | 'replied' | 'archived'
    adminNotes?: string
    readAt?: Date
    createdAt: Date
    updatedAt: Date
}

export type FormStats = {
    total: number
    new: number
    read: number
    replied: number
    archived: number
}

export async function fetchForms(params?: {
    search?: string
    status?: string
    formType?: string
    startDate?: string
    endDate?: string
}) {
    const queryParams = new URLSearchParams()

    if (params?.search) queryParams.append('search', params.search)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.formType) queryParams.append('formType', params.formType)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    return apiClient(`/admin/forms?${queryParams}`, {
        cache: 'no-store'
    })
}

export async function fetchForm(id: string) {
    return apiClient(`/admin/forms/${id}`, {
        cache: 'no-store'
    })
}

export async function getFormById(id: string) {
    const result = await apiClient(`/admin/forms/${id}`, {
        cache: 'no-store'
    })

    if (!result.success) {
        throw new Error(result.message || 'Form detayı alınamadı')
    }

    return result.data
}

export async function updateForm(id: string, data: { status?: string; adminNotes?: string }) {
    return apiClient(`/admin/forms/${id}`, {
        method: 'PUT',
        body: data
    })
}

export async function deleteForm(id: string) {
    return apiClient(`/admin/forms/${id}`, {
        method: 'DELETE'
    })
}