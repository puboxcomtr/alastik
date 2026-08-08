import { fetchAPI } from '@libs/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export async function getSettings(group: string) {
    try {
        return await fetchAPI(`${API_URL}/admin/settings/${group}`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('Ayarlar yüklenemedi')
    }
}

export async function updateSettings(group: string, data: Record<string, any>) {
    try {
        return await fetchAPI(`${API_URL}/admin/settings/${group}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    } catch {
        throw new Error('Ayarlar güncellenemedi')
    }
}
