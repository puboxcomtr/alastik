export type ProductType = {
  id: string | number
  _key?: string
  name: string
  sku: string
  barcode?: string
  brand?: string

  category: string
  subcategory?: string

  qty: number
  stock?: boolean
  status?: string
  webStatus?: string

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

  image: string
  images?: string[]
  customImages?: Array<{
    order: number
    url: string
    alt?: string
    title?: string
  }>

  seoTitle?: string
  seoDescription?: string
  seoUrl?: string | null
  seoKeywords?: string[]
  focusKeyword?: string

  delivery?: string

  description?: string | null
  customDescription?: string | null
  shortDescription?: string | null
  note?: string

  webVisible?: boolean
  webOrder?: number
  webTags?: string[]
  tag?: string

  sliderId?: string

  minOrderQuantity?: number
  maxOrderQuantity?: number | null
  stockAlert?: number

  isNew?: boolean
  isBestSeller?: boolean
  isFeatured?: boolean
  hideBrand?: boolean
  hideProductionDate?: boolean
  hideStock?: boolean

  properties?: Record<string, any>
  m_kategoriler?: Array<{
    kategori_aciklama_1?: string
    kategori_aciklama_2?: string
    kategori_aciklama_3?: string
    kategori_aciklama_4?: string
    kategori_aciklama_5?: string
    kategori_aciklama_6?: string
  }>

  ekalan1?: string
  ekalan2?: string
  ekalan3?: string
  ekalan4?: string
  ekalan5?: string
  originCountry?: string

  ozelkod1?: string
  ozelkod2?: string
  ozelkod3?: string
  ozelkod4?: string
  ozelkod5?: string

  actions?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  lastDiaSync?: string | Date
  syncStatus?: 'synced' | 'pending_sync' | 'not_in_dia' | 'error'
}

export interface CategorySyncInfo {
  lastSync?: Date
  syncStatus?: 'synced' | 'pending_sync' | 'not_in_dia' | 'error'
  syncSource?: string
  lastProductSync?: Date
}

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

  parent: string | null
  parentName: string
  parentPath: string

  diaCategory: string
  diaLevel: string

  webVisible: boolean
  webOrder: number
  status: string

  seoTitle: string
  seoUrl: string

  image: string
  customImage?: {
    url: string
    alt?: string
    title?: string
  } | null
  description?: string | null

  productCount: number
  activeProductCount: number
  totalStock: number

  createdAt: string
  updatedAt: string
  lastSync: string | null
  lastProductSync: string | null
  syncStatus: string
}

export interface ProductImageProps {
  product?: ProductType
}

export interface ProductInformationProps {
  product: ProductType
}

export interface ProductEnventoryProps {
  product: ProductType
}

export interface ProductFeaturesProps {
  product?: ProductType
}