// MUI Imports
import Grid from '@mui/material/Grid2'
import 'server-only'

// Component Imports
import BrandListTable from '@/views/brand/BrandListTable'

async function fetchBrands() {
  try {
    const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    const res = await fetch(`${baseUrl}/brands`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error('Markalar alınırken hata oluştu:', res.status, res.statusText)
      return { brands: [], error: 'Markalar yüklenirken hata oluştu' }
    }

    const data = await res.json()
    console.log('API Response:', data.data[0])
    const brands = (data.data || data || []).map((brand) => ({
      id: brand._id || brand.id,
      name: brand.name || '',
      slug: brand.slug || '',
      diaBrand: brand.diaBrand || '',
      diaMarkaAck: brand.diaMarkaAck || '',
      diaKey: brand.diaKey || '',
      webVisible: brand.webVisible !== false,
      webOrder: brand.webOrder || 0,
      status: brand.status || 'Inactive',
      seoTitle: brand.seoTitle || brand.name || '',
      seoDescription: brand.seoDescription || `${brand.name} markası ürünleri`,
      seoUrl: brand.seoUrl || brand.slug || '',
      seoKeywords: brand.seoKeywords || [],
      description: brand.description || '',
      logo: brand.logo || null,
      logoAlt: brand.logoAlt || `${brand.name} Logo`,
      bannerImage: brand.bannerImage || null,
      customImage: brand.customImage || '/images/brands/default-brand.jpg',
      brandInfo: {
        foundedYear: brand.brandInfo?.foundedYear || null,
        country: brand.brandInfo?.country || null,
        website: brand.brandInfo?.website || null,
        about: brand.brandInfo?.about || null
      },
      productCount: brand.productCount || 0,
      activeProductCount: brand.activeProductCount || 0,
      totalStock: brand.totalStock || 0,
      totalValue: brand.totalValue || 0,
      priceRange: {
        min: brand.priceRange?.min || 0,
        max: brand.priceRange?.max || 0,
        average: brand.priceRange?.average || 0,
        text: brand.priceRange?.text || 'Fiyat bilgisi yok',
        averageFormatted: brand.priceRange?.averageFormatted || '₺0'
      },
      categories: brand.categories || [],
      categoriesText: brand.categoriesText || 'Kategori yok',
      mainCategory: brand.mainCategory || 'Kategori yok',
      completenessScore: brand.completenessScore || 0,
      hasLogo: brand.hasLogo || false,
      hasDescription: brand.hasDescription || false,
      hasBrandInfo: brand.hasBrandInfo || false,
      hasWebsite: brand.hasWebsite || false,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
      lastSync: brand.lastSync,
      lastDiaSync: brand.lastDiaSync,
      lastProductSync: brand.lastProductSync,
      syncStatus: brand.syncStatus || 'unknown'
    }))

    return {
      brands,
      total: data.total || brands.length,
      meta: data.meta || {},
      error: null
    }

  } catch (error) {
    console.error('Markalar fetch edilirken hata:', error)
    return {
      brands: [],
      total: 0,
      meta: {},
      error: 'Markalar yüklenirken beklenmeyen hata oluştu'
    }
  }
}

const eCommerceProductsBrand = async () => {
  const data = await fetchBrands()
  if (data.error) {
    console.warn('Marka fetch hatası:', data.error)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <BrandListTable
          brandData={data.brands}
          totalBrands={data.total}
          meta={data.meta}
          error={data.error}
        />
      </Grid>
    </Grid>
  )
}

export default eCommerceProductsBrand