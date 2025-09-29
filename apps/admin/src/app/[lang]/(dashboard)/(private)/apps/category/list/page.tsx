// MUI Imports
import Grid from '@mui/material/Grid2'
import 'server-only'

/* @Import Page */
import ProductCategoryTable from '@views/category/ProductCategoryTable'
async function fetchCategories() {
  try {
    const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    const res = await fetch(`${baseUrl}/categories`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error('Kategoriler alınırken hata oluştu:', res.status, res.statusText)
      return { categories: [], error: 'Kategoriler yüklenirken hata oluştu' }
    }

    const data = await res.json()

    const categories = (data.data || data || []).map((category) => ({
      id: category._id || category.id,
      name: category.name || '',
      slug: category.slug || '',
      level: category.level || 1,
      parent: category.parent || null,
      parentPath: category.parentPath || [],
      diaCategory: category.diaCategory || '',
      diaLevel: category.diaLevel || '',
      webVisible: category.webVisible !== false,
      webOrder: category.webOrder || 0,
      seoTitle: category.seoTitle || category.name || '',
      seoUrl: category.seoUrl || category.slug || '',
      seoKeywords: category.seoKeywords || [],
      productCount: category.productCount || 0,
      activeProductCount: category.activeProductCount || 0,
      totalStock: category.totalStock || 0,
      syncInfo: category.syncInfo || {},
      showcase: category.showcase || [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }))

    return {
      categories,
      total: categories.length,
      error: null
    }

  } catch (error) {
    console.error('Kategoriler fetch edilirken hata:', error)
    return {
      categories: [],
      total: 0,
      error: 'Kategoriler yüklenirken beklenmeyen hata oluştu'
    }
  }
}

const eCommerceProductsCategory = async () => {
  const data = await fetchCategories()
  if (data.error) {
    console.warn('Kategori fetch hatası:', data.error)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <ProductCategoryTable
          categoryData={data.categories}
          totalCategories={data.total}
          error={data.error}
        />
      </Grid>
    </Grid>
  )
}

export default eCommerceProductsCategory