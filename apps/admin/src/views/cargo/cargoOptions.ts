// Kargo tanımı seçenekleri (kural sayfası + ekle/düzenle modalları ortak kullanır)

// Ürün tipi: stoklu (DIA) ya da XML tedarikçi ürünleri — hesaplamada aktif ayrım
export type CargoProductType = 'dia_api' | 'xml_integration'

export const CARGO_PRODUCT_TYPE_OPTIONS: { value: CargoProductType; label: string }[] = [
    { value: 'dia_api', label: 'Stoklu Ürünler' },
    { value: 'xml_integration', label: 'XML Ürünler' }
]

// Kural kapsamı (üst seçim): 'all' tüm ürünler (API'de '' olarak saklanır); category / brand / product
export type CargoScopeType = 'all' | 'category' | 'brand' | 'product' | 'size'

/** API değeri ('' = genel) ↔ arayüz değeri ('all') dönüşümü */
export const scopeFromApi = (v?: string | null): CargoScopeType => (v === 'category' || v === 'brand' || v === 'product' || v === 'size' ? v : 'all')
export const scopeToApi = (v: CargoScopeType) => (v === 'all' ? '' : v)

export const CARGO_SCOPE_OPTIONS: { value: CargoScopeType; label: string }[] = [
    { value: 'all', label: 'Tüm Ürünler' },
    { value: 'category', label: 'Kategori Bazlı' },
    { value: 'brand', label: 'Marka Bazlı' },
    { value: 'product', label: 'Ürün Bazlı' },
    { value: 'size', label: 'Ebat Bazlı' }
]

// Kargo ücretinin gösterimi: ürün fiyatına dahil (tek fiyat) ya da fiyattan hariç (sepette ayrı "Kargo Bedeli" satırı)
export type CargoShippingPriceMode = 'included' | 'excluded'

export const CARGO_SHIPPING_PRICE_MODE_OPTIONS: { value: CargoShippingPriceMode; label: string }[] = [
    { value: 'included', label: 'Ürün fiyatına dahil edilsin' },
    { value: 'excluded', label: 'Ürün fiyatından hariç tutulsun' }
]

// Fiyatlandırma biçimi (alt seçim): all = kapsamın tamamı için desi tablosu; size = ebat başına ücret
export type CargoPricingMode = 'all' | 'size'

export const CARGO_PRICING_MODE_OPTIONS: { value: CargoPricingMode; label: string }[] = [
    { value: 'all', label: 'Tümü' },
    { value: 'size', label: 'Ebat Bazlı' }
]
