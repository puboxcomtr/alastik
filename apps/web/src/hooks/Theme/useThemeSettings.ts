import { useState, useEffect } from 'react'

import type { ThemeSettings } from '@src/types/theme';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082'

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
            const res = await fetch(`${API_URL}/admin/design/settings/theme`, {
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
        if (path.startsWith('http')) return path
        return `${MEDIA_URL}${path.startsWith('/') ? path : '/' + path}`
    }

    return {
        settings,
        loading,
        error,
        getImageUrl,
        refetch: fetchSettings
    }
}