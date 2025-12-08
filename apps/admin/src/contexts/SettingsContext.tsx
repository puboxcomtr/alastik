'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'react-toastify'

// Settings veri tipi
interface SettingsData {
    companyInfo?: {
        name?: string
        officialName?: string
        website?: string
        authorizedPerson?: string
        phone?: string
        phone2?: string
        fax?: string
        country?: string
        city?: string
        district?: string
        postalCode?: string
        address?: string
    }
    emailInfo?: {
        email?: string
        orderEmail?: string
    }
    taxInfo?: {
        registrationNumber?: string
        taxOffice?: string
        taxNumber?: string
    }
    legalContracts?: {
        contact?: string
        preInformation?: string
        membershipAgreement?: string
        kvkk?: string
        salesAgreement?: string
        returnPolicy?: string
        salesConditions?: string
    }
    images?: {
        mailLogo?: string
        favicon?: string
    }
}

interface SettingsContextType {
    settings: SettingsData | null
    updateData: Partial<SettingsData>
    hasChanges: boolean
    isLoading: boolean
    updateField: (category: keyof SettingsData, field: string, value: any) => void
    saveChanges: () => Promise<boolean>
    resetChanges: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({
    children,
    initialSettings
}: {
    children: ReactNode
    initialSettings: SettingsData | null
}) {
    const [settings, setSettings] = useState<SettingsData | null>(initialSettings)
    const [updateData, setUpdateData] = useState<Partial<SettingsData>>({})
    const [isLoading, setIsLoading] = useState(false)

    const hasChanges = Object.keys(updateData).length > 0

    const updateField = useCallback((category: keyof SettingsData, field: string, value: any) => {
        setUpdateData(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [field]: value
            }
        }))
    }, [])

    const saveChanges = async (): Promise<boolean> => {
        if (!hasChanges) {
            toast.info('Değişiklik yapılmadı')
            return false
        }

        setIsLoading(true)

        try {
            const response = await fetch('http://localhost:3082/api/admin/settings/general', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            })

            const result = await response.json()

            if (result.success) {
                toast.success('Ayarlar başarıyla kaydedildi')
                setSettings(result.data)
                setUpdateData({})
                return true
            } else {
                toast.error(result.message || 'Kaydetme başarısız')
                return false
            }
        } catch (error) {
            console.error('Kaydetme hatası:', error)
            toast.error('Kaydetme sırasında hata oluştu')
            return false
        } finally {
            setIsLoading(false)
        }
    }

    const resetChanges = useCallback(() => {
        setUpdateData({})
        toast.info('Değişiklikler sıfırlandı')
    }, [])

    return (
        <SettingsContext.Provider
            value={{
                settings,
                updateData,
                hasChanges,
                isLoading,
                updateField,
                saveChanges,
                resetChanges
            }}
        >
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider')
    }
    return context
}