import { redirect } from 'next/navigation'
import type { OrderType } from '@/types/apps/orderTypes'
import OrderDetails from '@views/apps/orders/details'

async function getOrderDetail(orderNumber: string) {
  const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

  try {
    const res = await fetch(`${baseUrl}/admin/orders/${orderNumber}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('Sipariş bulunamadı:', res.status)
      return null
    }

    const response = await res.json()
    return response.data
  } catch (error) {
    console.error('Sipariş detay hatası:', error)
    return null
  }
}

const OrderDetailsPage = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params
  const orderData = await getOrderDetail(params.id)

  if (!orderData) {
    redirect('/not-found')
  }

  return <OrderDetails orderData={orderData} order={params.id} />
}

export default OrderDetailsPage