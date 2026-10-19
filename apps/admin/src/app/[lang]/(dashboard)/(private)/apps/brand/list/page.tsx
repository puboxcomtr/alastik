import Grid from '@mui/material/Grid2'

import BrandListTable from '@/views/brand/BrandListTable'

const eCommerceProductsBrand = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <BrandListTable />
      </Grid>
    </Grid>
  )
}

export default eCommerceProductsBrand