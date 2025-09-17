export type ProductType = {
  id: string | number
  name: string
  sku: string
  price: number
  price2: number
  qty: number
  category: string
  image: string
  images?: string[]
  brand?: string
  status?: string
  actions?: string
  barcode?: string
  note?: string
  stock?: boolean
  seo_title?: string
  seo_description?: string
  seo_url?: string
  price3?: number
  price4?: number
  price5?: number
  price6?: number
  tag?: string
  properties?: Record<string, any>
  m_kategoriler?: Array<{
    kategori_aciklama_1?: string
    kategori_aciklama_2?: string
    kategori_aciklama_3?: string
  }>
}