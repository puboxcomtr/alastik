import Grid from '@mui/material/Grid2'

import ProductListTable from '@views/apps/ecommerce/products/list/ProductListTable'
import SyncDropdown from '@views/apps/ecommerce/products/components/SyncDropdown'

const eCommerceProductsList = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <SyncDropdown />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <ProductListTable /> 
      </Grid>
    </Grid>
  )
}

export default eCommerceProductsList