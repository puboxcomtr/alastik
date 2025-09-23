'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { ProductType } from '@/types/apps/productTypes'

// Update edilecek alanları tanımla
interface ProductUpdateData {
    seoTitle?: string
    seoDescription?: string
    seoUrl?: string
    seoKeywords?: string[]
    webVisible?: boolean
    webTags?: string[]
    webCategory?: string
    customDescription?: string
    webPrice?: number | null
}

interface ToastMessage {
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
}

interface ProductUpdateContextType {
    // State
    originalProduct: ProductType | null
    updateData: ProductUpdateData
    isLoading: boolean
    hasChanges: boolean

    // Actions
    setOriginalProduct: (product: ProductType) => void
    updateField: (field: keyof ProductUpdateData, value: any) => void
    resetChanges: () => void
    saveChanges: () => Promise<boolean>

    // Toast
    showToast: (toast: ToastMessage) => void
}

const ProductUpdateContext = createContext<ProductUpdateContextType | null>(null)

interface ProductUpdateProviderProps {
    children: ReactNode
    productId: string
}

export function ProductUpdateProvider({ children, productId }: ProductUpdateProviderProps) {
    const [originalProduct, setOriginalProduct] = useState<ProductType | null>(null)
    const [updateData, setUpdateData] = useState<ProductUpdateData>({})
    const [isLoading, setIsLoading] = useState(false)
    const [toast, setToast] = useState<ToastMessage | null>(null)

    // Değişiklik kontrolü
    const hasChanges = Object.keys(updateData).length > 0

    // Alan güncelleme
    const updateField = useCallback((field: keyof ProductUpdateData, value: any) => {
        setUpdateData(prev => {
            const newData = { ...prev }
            if (originalProduct && originalProduct[field as keyof ProductType] === value) {
                delete newData[field]
            } else {
                newData[field] = value
            }
            return newData
        })
    }, [originalProduct])

    // Değişiklikleri sıfırla
    const resetChanges = useCallback(() => {
        setUpdateData({})
    }, [])

    // Toast göster
    const showToast = useCallback((toastMessage: ToastMessage) => {
        setToast(toastMessage)
        setTimeout(() => setToast(null), 5000)
    }, [])

    // Değişiklikleri kaydet
    const saveChanges = useCallback(async (): Promise<boolean> => {
        if (!hasChanges || !productId) {
            showToast({
                type: 'warning',
                title: 'Uyarı',
                message: 'Kaydedilecek değişiklik bulunamadı'
            })
            return false
        }

        setIsLoading(true)

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082'
            const apiUrl = `${baseUrl}/products/${productId}`

            const response = await fetch(apiUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            })

            const responseText = await response.text()

            // Content type kontrol et
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                showToast({
                    type: 'error',
                    title: 'API Hatası',
                    message: 'Sunucudan geçersiz response alındı'
                })
                return false
            }

            // JSON parse et
            let result
            try {
                result = JSON.parse(responseText)
            } catch (parseError) {
                showToast({
                    type: 'error',
                    title: 'Parse Hatası',
                    message: 'Sunucu response\'u işlenemedi'
                })
                return false
            }

            if (result.success) {
                // Başarı toast'ı göster
                if (result.toast) {
                    showToast(result.toast)
                } else {
                    showToast({
                        type: 'success',
                        title: 'Başarılı',
                        message: result.message || 'Ürün başarıyla güncellendi'
                    })
                }
                setUpdateData({})
                if (result.data && originalProduct) {
                    setOriginalProduct({
                        ...originalProduct,
                        ...result.data
                    })
                }

                return true
            } else {
                // Hata toast'ı göster
                if (result.toast) {
                    showToast(result.toast)
                } else {
                    showToast({
                        type: 'error',
                        title: 'Hata',
                        message: result.message || 'Güncelleme sırasında hata oluştu'
                    })
                }

                return false
            }
        } catch (error) {
            showToast({
                type: 'error',
                title: 'Bağlantı Hatası',
                message: 'Sunucu ile bağlantı kurulamadı. Lütfen tekrar deneyin.'
            })
            return false
        } finally {
            setIsLoading(false)
        }
    }, [productId, updateData, hasChanges, originalProduct, showToast])

    const contextValue: ProductUpdateContextType = {
        originalProduct,
        updateData,
        isLoading,
        hasChanges,
        setOriginalProduct,
        updateField,
        resetChanges,
        saveChanges,
        showToast
    }

    return (
        <ProductUpdateContext.Provider value={contextValue}>
            {children}
            {/* Toast Component */}
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        zIndex: 9999,
                        padding: '16px',
                        borderRadius: '8px',
                        maxWidth: '400px',
                        backgroundColor: toast.type === 'success' ? '#4CAF50' :
                            toast.type === 'error' ? '#f44336' :
                                toast.type === 'warning' ? '#ff9800' : '#2196F3',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                >
                    <strong>{toast.title}</strong>
                    <div style={{ marginTop: '4px', fontSize: '14px' }}>
                        {toast.message}
                    </div>
                </div>
            )}
        </ProductUpdateContext.Provider>
    )
}

export function useProductUpdate() {
    const context = useContext(ProductUpdateContext)
    if (!context) {
        throw new Error('useProductUpdate must be used within ProductUpdateProvider')
    }
    return context
}