// MUI Imports
import Grid from '@mui/material/Grid2'
import 'server-only'

/* @Import Page */
import ProductListTable from '@views/apps/ecommerce/products/list/ProductListTable'
import SyncDropdown from '@views/apps/ecommerce/products/components/SyncDropdown'

async function fetchProducts() {
  const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

  const res = await fetch(`${baseUrl}/products?page=1&limit=50`, {
    cache: 'no-store',
  })
  if (!res.ok) return { products: [] }
  const data = await res.json()


  const filteredProducts = (data.data || data.veri || [])
    .filter((product: any) =>
      !product.sku?.includes('2.EL-') &&
      product.qty > 0
    )
    .map((product: any) => ({
      id: product.id,
      productName: product.name,
      sku: product.sku,
      price: product.price,
      price1: product.price1,
      price2: product.price2,
      price3: product.price3,
      price4: product.price4,
      price10: product.price10,
      qty: product.qty,
      stock: product.qty > 0,
      status: product.status,
      image: product.image,
      category: product.category || 'Lastik',
      brand: product.brand,
      m_kategoriler: product.m_kategoriler
    }))

  return { products: filteredProducts }
}

const eCommerceProductsList = async () => {
  const data = await fetchProducts()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <SyncDropdown />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <ProductListTable productData={data?.products} />
      </Grid>
    </Grid>
  )
}

export default eCommerceProductsList