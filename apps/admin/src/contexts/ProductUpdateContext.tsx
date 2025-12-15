'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { ProductType } from '@/types/apps/productTypes'
import { API_ENDPOINTS, fetchAPI } from '@/libs/api'

// Update edilecek alanları tanımla
interface ProductUpdateData {
    seoTitle?: string
    seoDescription?: string
    seoUrl?: string
    delivery?: string
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

    const hasChanges = Object.keys(updateData).length > 0

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
    const resetChanges = useCallback(() => {
        setUpdateData({})
    }, [])
    const showToast = useCallback((toastMessage: ToastMessage) => {
        setToast(toastMessage)
        setTimeout(() => setToast(null), 5000)
    }, [])

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
            const result = await fetchAPI(API_ENDPOINTS.products.update(productId), {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            })

            if (result.success) {
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
            console.error('Update error:', error)
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