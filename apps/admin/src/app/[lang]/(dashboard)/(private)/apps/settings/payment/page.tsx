// MUI Imports
import Grid from '@mui/material/Grid2'

/* @Import Views */
import PaymentMethodListTable from '@/views/payment/list/PaymentListTable'

// Liste, aktif site (X-Site) başlığıyla istemci tarafında yüklenir — sunucu fetch'i site seçimini göremiyordu
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
