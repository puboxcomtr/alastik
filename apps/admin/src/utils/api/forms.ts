const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

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

    const response = await fetch(`${API_URL}/admin/forms?${queryParams}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Formlar yüklenemedi')
    }

    return response.json()
}

export async function fetchForm(id: string) {
    const response = await fetch(`${API_URL}/admin/forms/${id}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Form bulunamadı')
    }

    return response.json()
}

export async function getFormById(id: string) {
    const response = await fetch(`${API_URL}/admin/forms/${id}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Form bulunamadı')
    }

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.message || 'Form detayı alınamadı')
    }

    return result.data
}

export async function updateForm(id: string, data: { status?: string; adminNotes?: string }) {
    const response = await fetch(`${API_URL}/admin/forms/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Form güncellenemedi')
    }

    return response.json()
}

export async function deleteForm(id: string) {
    const response = await fetch(`${API_URL}/admin/forms/${id}`, {
        method: 'DELETE'
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Form silinemedi')
    }

    return response.json()
}