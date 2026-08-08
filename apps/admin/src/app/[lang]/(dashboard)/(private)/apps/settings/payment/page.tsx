// MUI Imports
import Grid from '@mui/material/Grid2'
import 'server-only'

import { getServerSession } from 'next-auth/next'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// API Imports
import { fetchAPI } from '@libs/api'

/* @Import Views */
import PaymentMethodListTable from '@/views/payment/list/PaymentListTable'

async function fetchPaymentMethods() {
    const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    try {
        const session = await getServerSession(authOptions)
        const token = (session?.user as any)?.accessToken

        const data = await fetchAPI(`${baseUrl}/admin/settings/payment`, {
            cache: 'no-store',
            ...(token && { headers: { Authorization: `Bearer ${token}` } })
        })

        return {
            methods: data.data || [],
            stats: data.stats || null
        }
    } catch (error) {
        console.error('Fetch Error:', error)
        return { methods: [], stats: null }
    }
}


const PaymentMethodsPage = async () => {
    const data = await fetchPaymentMethods()

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <PaymentMethodListTable methodData={data?.methods} />
            </Grid>
        </Grid>
    )
}
export default PaymentMethodsPage
