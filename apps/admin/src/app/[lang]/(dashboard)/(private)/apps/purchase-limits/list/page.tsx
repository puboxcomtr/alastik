import Grid from '@mui/material/Grid2'

import PurchaseLimitListTable from '@views/purchase-limits/list/PurchaseLimitListTable'

const PurchaseLimitsListPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <PurchaseLimitListTable />
            </Grid>
        </Grid>
    )
}

export default PurchaseLimitsListPage