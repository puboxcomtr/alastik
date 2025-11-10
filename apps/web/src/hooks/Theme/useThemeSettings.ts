import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3082'

export interface ThemeSettings {
    logo?: string
    footerLogo?: string
    footerSslImage?: string
    defaultCatalogImage?: string
    brandDisplayType?: string
    showcaseDisplayCount?: string
    blogDisplayCount?: string
    isActive?: boolean
    isBrand?: boolean
    isTax?: boolean
    isFacebook?: boolean
    isGoogle?: boolean
    isLazyLoad?: boolean
    footerMobile?: string
    newsletterTitle?: string
    newsletterContent?: string
    seoTitle?: string
    facebook?: string
    instagram?: string
    twitter?: string
    youtube?: string
    linkedin?: string
    whatsapp?: string
    trendyol?: string
    hepsiburada?: string
    pttavm?: string
    pazarama?: string
    n11?: string
    idefix?: string
    homepage?: boolean
    sliderSelect?: string
    mobileSelect?: string
    autostart?: boolean
    showcaseFirst?: string
    showcasenameFirst?: string
    showcasesubFirst?: string
    showcaseSecond?: string
    showcasenameSecond?: string
    showcasesubSecond?: string
    showcaseThird?: string
    showcasenameThird?: string
    showcasesubThird?: string
}

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
        if (path.startsWith('/')) return `${BASE_URL}${path}`
        return `${BASE_URL}/${path}`
    }

    return {
        settings,
        loading,
        error,
        getImageUrl,
        refetch: fetchSettings
    }
}