// MUI Imports
import Grid from '@mui/material/Grid2'
import 'server-only'

/* @Import Views */
import PaymentMethodListTable from '@/views/payment/list/PaymentListTable'

async function fetchPaymentMethods() {
    const baseUrl = 'http://localhost:3082/api'

    try {
        console.log('🔍 Fetching from:', `${baseUrl}/admin/settings/payment`) // 👈 DEBUG

        const res = await fetch(`${baseUrl}/admin/settings/payment`, {
            cache: 'no-store',
        })

        console.log('📡 Response status:', res.status) // 👈 DEBUG

        if (!res.ok) {
            console.error('❌ API Error:', res.status, res.statusText)
            return { methods: [], stats: null }
        }

        const data = await res.json()
        console.log('📦 Received data:', data) // 👈 DEBUG
        console.log('📦 Methods count:', data.data?.length) // 👈 DEBUG

        return {
            methods: data.data || [],
            stats: data.stats || null
        }
    } catch (error) {
        console.error('❌ Fetch Error:', error)
        return { methods: [], stats: null }
    }
}


const PaymentMethodsPage = async () => {
    const data = await fetchPaymentMethods()

    console.log('🎯 Passing to component:', data.methods?.length, 'methods') // 👈 DEBUG

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <PaymentMethodListTable methodData={data?.methods} />
            </Grid>
        </Grid>
    )
}
export default PaymentMethodsPage