import { apiClient } from './apiClient'
import type { ThemeSettings, ThemeImageType } from '@/types/apps/themeTypes'

export async function getThemeSettings() {
    return apiClient<{ success: boolean; data: ThemeSettings }>('/admin/design/settings/theme')
}

export async function updateThemeSettings(settings: Partial<ThemeSettings>) {
    return apiClient<{ success: boolean; message: string }>('/admin/design/settings/theme', {
        method: 'PUT',
        body: { value: settings }
    })
}

export async function uploadThemeImage(file: File, type: ThemeImageType) {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', type)

    return apiClient<{ success: boolean; data?: { url: string } }>('/admin/design/settings/theme/upload', {
        method: 'POST',
        body: formData,
        headers: {}
    })
}