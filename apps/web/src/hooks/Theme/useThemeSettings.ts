import { useState, useEffect } from 'react'

import type { ThemeSettings } from '@src/types/theme';
import { API_ENDPOINTS, getImageUrl as apiGetImageUrl } from '@/src/config/api';

export const useThemeSettings = () => {
    const [settings, setSettings] = useState<ThemeSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            setLoading(true)
            const res = await fetch(API_ENDPOINTS.theme.designSettings(), {
                cache: 'no-store'
            })

            if (!res.ok) {
                throw new Error('Tema ayarları yüklenemedi')
            }

            const data = await res.json()

            if (data.success && data.data) {
                setSettings(data.data)
            }
        } catch (err: any) {
            setError(err.message)
            console.error('Theme settings fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const getImageUrl = (path?: string) => {
        if (!path) return null
        return apiGetImageUrl(path)
    }

    return {
        settings,
        loading,
        error,
        getImageUrl,
        refetch: fetchSettings
    }
}