// apps/web/src/hooks/Products/purchaseLimitHelpers.ts
import { Product } from '@src/types/products'
import { API_ENDPOINTS } from '@/src/config/api'

export interface LimitCheckItem {
    sku: string
    brand: string
    categoryNames: string[]
    quantity: number
}

export interface LimitViolation {
    sku: string
    message: string
    limitName: string
    currentQty: number
    allowedMax: number | null
    allowedMin: number | null
}

export interface LimitCheckResponse {
    success: boolean
    valid: boolean
    violations: LimitViolation[]
}

/**
 * Ürün için kategori isimlerini topla
 */
export const getCategoryNamesFromProduct = (product: Product): string[] => {
    const cat = product.diaData?.m_kategoriler?.[0]
    if (!cat) return []

    return [
        cat.kategori_aciklama_1,
        cat.kategori_aciklama_2,
        cat.kategori_aciklama_3,
        cat.kategori_aciklama_4,
        cat.kategori_aciklama_5,
        cat.kategori_aciklama_6
    ].filter((v): v is string => Boolean(v && v.trim()))
}

/**
 * Ürünün mevcut stok adedini döndürür
 */
export const getProductStock = (product: Product): number => {
    return product.diaData?.gercek_stok ?? 0
}

/**
 * Sepetteki mevcut adet + eklenecek adet stok sınırını aşıyor mu kontrol eder.
 * Adet seçici olmayan (tek tıkla ekle) kartlar için kullanılır.
 * allowed: eklemeye izin var mı
 * maxStock: ürünün toplam stok adedi
 * remaining: sepete daha eklenebilecek adet
 */
export const canAddToCartStock = (
    product: Product,
    currentInCart: number,
    addQty: number = 1
): { allowed: boolean; maxStock: number; remaining: number } => {
    const maxStock = getProductStock(product)
    const remaining = Math.max(0, maxStock - currentInCart)

    if (maxStock <= 0) {
        return { allowed: false, maxStock: 0, remaining: 0 }
    }
    if (currentInCart + addQty > maxStock) {
        return { allowed: false, maxStock, remaining }
    }
    return { allowed: true, maxStock, remaining }
}

/**
 * Girilen adedi stok ve minimum sınırına göre kısıtlar.
 * clamped: sınıra çekilmiş güvenli adet
 * exceeded: kullanıcı stok sınırını aşmaya çalıştı mı
 * maxStock: ürünün seçilebilir maksimum adedi
 */
export const clampQuantityToStock = (
    product: Product,
    quantity: number
): { clamped: number; exceeded: boolean; maxStock: number } => {
    const maxStock = getProductStock(product)

    if (maxStock <= 0) {
        return { clamped: 0, exceeded: false, maxStock: 0 }
    }
    if (quantity < 1) {
        return { clamped: 1, exceeded: false, maxStock }
    }
    if (quantity > maxStock) {
        return { clamped: maxStock, exceeded: true, maxStock }
    }
    return { clamped: quantity, exceeded: false, maxStock }
}
/**
 * Ürünü limit check item'a çevir
 */
export const productToLimitCheckItem = (product: Product, quantity: number): LimitCheckItem => ({
    sku: product.diaData?.stokkartkodu || product.diaData?.anabarkod || '',
    brand: product.diaData?.marka || '',
    categoryNames: getCategoryNamesFromProduct(product),
    quantity
})

/**
 * Sepete ekleme öncesi limit kontrolü
 */
export const checkPurchaseLimit = async (
    items: LimitCheckItem[]
): Promise<LimitCheckResponse> => {
    try {
        const response = await fetch(API_ENDPOINTS.purchaseLimits.check(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
            cache: 'no-store'
        })

        if (!response.ok) {
            return { success: false, valid: true, violations: [] }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Purchase limit check error:', error)
        return { success: false, valid: true, violations: [] }
    }
}