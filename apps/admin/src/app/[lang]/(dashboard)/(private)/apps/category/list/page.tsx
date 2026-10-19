import Grid from '@mui/material/Grid2'

import ProductCategoryTable from '@views/category/ProductCategoryTable'

const eCommerceProductsCategory = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <ProductCategoryTable />
      </Grid>
    </Grid>
  )
}

export default eCommerceProductsCategory