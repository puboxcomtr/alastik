'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'react-toastify'

import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import OrderTitle from '@/views/order/detail/Content/Title'
import OrderDetailContent from '@/views/order/detail/Content/OrderDetail'
import CustomerInformation from '@/views/order/detail/Content/CustomerInformation'
import PaymentInformation from '@/views/order/detail/Content/PaymentInformation'
import OrderStatus from '@/views/order/detail/Content/OrderStatus'
import OrderNote from '@/views/order/detail/Content/OrderNote'
import CustomerDetail from '@/views/order/detail/Content/CustomerDetail'
import CarInformation from '@/views/order/detail/Content/CarInformation'

const OrderDetailPage = () => {
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const verifyNkolayPayment = async (loadedOrder: any) => {
    // Sadece Nkolay + henüz ödenmemiş siparişler için sessiz doğrulama
    if (loadedOrder?.payment?.gateway !== 'nkolay') return
    if (loadedOrder?.payment?.status === 'paid') return

    try {
      const verifyRes = await fetchAPI(API_ENDPOINTS.orders.verifyPayment(loadedOrder.id), { method: 'POST' })
      if (verifyRes?.updated) {
        toast.success('Ödeme doğrulandı, sipariş onaylandı')
        // Güncel veriyi tekrar çek
        const refreshed = await fetchAPI(API_ENDPOINTS.orders.detail(orderId))
        if (refreshed.success) setOrder(refreshed.data)
      }
    } catch (error) {
      console.error('Ödeme doğrulama hatası:', error)
    }
  }

  const loadOrder = async () => {
    try {
      setLoading(true)
      const response = await fetchAPI(API_ENDPOINTS.orders.detail(orderId))

      if (response.success) {
        setOrder(response.data)
        verifyNkolayPayment(response.data)
      } else {
        toast.error('Sipariş bulunamadı')
      }
    } catch (error) {
      console.error('Sipariş yüklenirken hata:', error)
      toast.error('Sipariş yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <CircularProgress />
      </div>
    )
  }

  if (!order) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <Typography>Sipariş bulunamadı</Typography>
      </div>
    )
  }

  return (
    <Grid container spacing={6} className='flex items-center justify-center'>
      <Grid item xs={12} md={9}>
        <OrderTitle
          orderNumber={order.orderNumber}
          status={order.status}
          statusText={order.statusText}
          createdAt={order.createdAt}
        />
      </Grid>
      <Grid item xs={12} md={9}>
        <Grid container spacing={12}>
          <Grid item xs={12} md={8}>
            <OrderDetailContent
              items={order.items}
              pricing={order.pricing}
            />
            <CustomerInformation
              shippingAddress={order.shippingAddress}
              billingAddress={order.billingAddress}
              customerNote={order.customerNote}
              site={order.site}
            />
            <PaymentInformation
              payment={order.payment}
              isGuest={order.isGuest}
              ipAddress={order.ipAddress}
              shippingMethod={order.shipping?.method}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <OrderStatus
              orderId={order.id}
              status={order.status}
              manualCollection={order.payment?.manualCollection}
              onStatusChange={(newStatus) => setOrder({ ...order, status: newStatus })}
            />
            <OrderNote orderId={order.id} adminNote={order.adminNote} />
            <CustomerDetail
              isGuest={order.isGuest}
              memberInfo={order.memberInfo}
            />
            <CarInformation
              isGuest={order.isGuest}
              vehicleInfo={order.vehicleInfo}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default OrderDetailPage