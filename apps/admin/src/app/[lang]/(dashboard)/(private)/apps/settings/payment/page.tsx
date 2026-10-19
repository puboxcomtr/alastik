import Grid from '@mui/material/Grid2'

import PaymentMethodListTable from '@/views/payment/list/PaymentListTable'

const PaymentMethodsPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <PaymentMethodListTable />
            </Grid>
        </Grid>
    )
}

export default PaymentMethodsPage
