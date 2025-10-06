import Grid from '@mui/material/Grid2'
import 'server-only'

import OrderListTable from '@views/apps/orders/list/OrderListTable'
/* Types Import */
import type { OrderApiResponse, OrderTableRow } from '@/types/apps/orderTypes'

async function fetchOrders() {
    const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    try {
        const res = await fetch(`${baseUrl}/admin/orders`, {
            cache: 'no-store',
        })

        if (!res.ok) return { orders: [] }

        const data = await res.json()

        const orders: OrderTableRow[] = (data.data?.orders || []).map((order: OrderApiResponse, index: number) => ({
            id: index + 1,
            order: order.orderNumber,
            date: order.date,
            customer: order.customerName,
            phone: order.phone || '',
            email: order.email || '',
            status: order.status,
            payment: order.status === 'confirmed' ? 'paid' : 'pending',
            total: order.total,
            currency: order.currency
        }))

        return { orders }
    } catch (error) {
        console.error('Order fetch error:', error)
        return { orders: [] }
    }
}

const OrderListPage = async () => {
    const data = await fetchOrders()

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <OrderListTable orderData={data?.orders} />
            </Grid>
        </Grid>
    )
}

export default OrderListPage