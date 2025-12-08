export type ProductType = {
  // Temel Kimlik Bilgileri
  id: string | number
  _key?: string
  name: string
  sku: string
  barcode?: string
  brand?: string

  // Kategori Bilgileri
  category: string
  subcategory?: string

  // Stok ve Durum
  qty: number
  stock?: boolean
  status?: string
  webStatus?: string

  // Fiyatlandırma - Tüm Fiyat Seviyeleri
  price: number
  price1: number
  price2: number
  price3: number
  price4: number
  price5: number
  price6: number
  price10: number
  webPrice: number | null
  originalPrice: number | null
  discount: number
  discountType: 'percentage' | 'fixed'

  // Görseller
  image: string
  images?: string[]
  customImages?: Array<{
    order: number
    url: string
    alt?: string
    title?: string
  }>

  // SEO Bilgileri
  seo_title?: string
  seo_description?: string
  seo_url?: string | null
  seo_keywords?: string[]

  // İçerik ve Açıklamalar
  delivery?: string

  // İçerik ve Açıklamalar
  description?: string | null
  customDescription?: string | null
  shortDescription?: string | null
  note?: string

  // Web Özel Alanları
  webVisible?: boolean
  webOrder?: number
  webTags?: string[]
  tag?: string

  // Slider 
  sliderId?: string 

  // Stok Yönetimi
  minOrderQuantity?: number
  maxOrderQuantity?: number | null
  stockAlert?: number

  // Etiketler ve Durumlar
  isNew?: boolean
  isBestSeller?: boolean
  isFeatured?: boolean

  // Ürün Özellikleri ve Kategoriler
  properties?: Record<string, any>
  m_kategoriler?: Array<{
    kategori_aciklama_1?: string
    kategori_aciklama_2?: string
    kategori_aciklama_3?: string
    kategori_aciklama_4?: string
    kategori_aciklama_5?: string
    kategori_aciklama_6?: string
  }>

  // DIA Ek Alanları (WebProduct'tan gelen)
  ekalan1?: string
  ekalan2?: string
  ekalan3?: string
  ekalan4?: string
  ekalan5?: string
  originCountry?: string

  // Özel Kodlar (gerekirse)
  ozelkod1?: string
  ozelkod2?: string
  ozelkod3?: string
  ozelkod4?: string
  ozelkod5?: string

  // Meta Bilgiler
  actions?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  lastDiaSync?: string | Date
  syncStatus?: 'synced' | 'pending_sync' | 'not_in_dia' | 'error'
}

// Kategori Senkronizasyon Bilgileri
export interface CategorySyncInfo {
  lastSync?: Date
  syncStatus?: 'synced' | 'pending_sync' | 'not_in_dia' | 'error'
  syncSource?: string
  lastProductSync?: Date
}

// Kategori Type Definition
export type CategoryType = {
  id: string
  name: string
  slug: string
  level: number
  parent: string | null
  parentPath: string[]
  diaCategory: string
  diaLevel: string
  webVisible: boolean
  webOrder: number
  seoTitle: string
  seoDescription: string
  seoUrl: string
  seoKeywords: string[]
  productCount: number
  activeProductCount: number
  totalStock: number
  syncInfo: CategorySyncInfo
  showcase: any[]
  description?: string 
  customImage?: {     
    url: string
    alt?: string
    title?: string
  }
  createdAt?: string | Date
  updatedAt?: string | Date
}

export type WebCategoryType = {
  id: string
  name: string
  slug: string
  level: number
  levelName: string

  // Hiyerarşi
  parent: string | null
  parentName: string
  parentPath: string

  // DIA bağlantısı
  diaCategory: string
  diaLevel: string

  // Web yönetimi
  webVisible: boolean
  webOrder: number
  status: string

  // SEO
  seoTitle: string
  seoUrl: string

  // Görsel ve içerik - manuel doldurulabilir
  image: string
  customImage?: {
    url: string
    alt?: string
    title?: string
  } | null
  description?: string | null

  // İstatistikler
  productCount: number
  activeProductCount: number
  totalStock: number

  // Tarihler
  createdAt: string
  updatedAt: string
  lastSync: string | null
  lastProductSync: string | null
  syncStatus: string
}