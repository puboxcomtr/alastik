const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export async function getSettings(group: string) {
    const response = await fetch(`${API_URL}/admin/settings/${group}`, {
        cache: 'no-store'
    })

    if (!response.ok) {
        throw new Error('Ayarlar yüklenemedi')
    }

    return response.json()
}

export async function updateSettings(group: string, data: Record<string, any>) {
    const response = await fetch(`${API_URL}/admin/settings/${group}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Ayarlar güncellenemedi')
    }

    return response.json()
}