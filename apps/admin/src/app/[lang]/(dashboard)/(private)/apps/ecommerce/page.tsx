'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { toast } from 'react-toastify'

// Components Imports
import CardStatVertical from '@views/dashboard/Vertical'
import TotalProfitStackedBar from '@views/dashboard/TotalProfitStackedBar'
import Transactions from '@views/dashboard/Transactions'
import WebsiteStatistics from '@views/dashboard/WebsiteStatistics'
import Table from '@views/dashboard/Table'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { ProfitStats } from '@views/dashboard/TotalProfitStackedBar'
import type { TransactionItem } from '@views/dashboard/Transactions'
import type { VisitStats } from '@views/dashboard/WebsiteStatistics'
import type { RecentOrder } from '@views/dashboard/Table'

type DashboardData = {
    cards: {
        totalSales: { value: number; trend: number }
        totalOrders: { value: number; trend: number }
        pendingOrders: { value: number }
        newMembers: { value: number; trend: number }
    }
    profit: ProfitStats
    paymentMethods: TransactionItem[]
    visits: VisitStats
    recentOrders: RecentOrder[]
}

const formatTRY = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const trendProps = (trend?: number) => ({
    trendNumber: `${Math.abs(trend || 0)}%`,
    trend: (trend || 0) < 0 ? ('negative' as const) : ('positive' as const)
})

const DashboardECommerce = () => {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.dashboard.ecommerce(), { cache: 'no-store' })

                if (res.success) {
                    setData(res.data)
                } else {
                    toast.error(res.message || 'Pano verileri yüklenemedi')
                }
            } catch (error) {
                console.error('Dashboard fetch error:', error)
                toast.error('Pano verileri yüklenirken hata oluştu')
            } finally {
                setLoading(false)
            }
        }

        fetchDashboard()
    }, [])

    if (loading) {
        return (
            <div className='flex items-center justify-center gap-3' style={{ minHeight: '300px' }}>
                <CircularProgress size={28} />
                <Typography>Pano verileri yükleniyor...</Typography>
            </div>
        )
    }

    if (!data) {
        return <Typography color='text.secondary'>Pano verileri yüklenemedi.</Typography>
    }

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 12 }}>
                <Grid container spacing={6}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title='Satış Tutarı (30 Gün)'
                            stats={`${formatTRY(data.cards.totalSales.value)} TL`}
                            avatarIcon='ri-wallet-2-line'
                            avatarColor='success'
                            {...trendProps(data.cards.totalSales.trend)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title='Sipariş (30 Gün)'
                            stats={`${data.cards.totalOrders.value.toLocaleString('tr-TR')} Adet`}
                            avatarIcon='ri-shopping-cart-line'
                            avatarColor='info'
                            {...trendProps(data.cards.totalOrders.trend)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title='Onay Bekleyen Sipariş'
                            stats={`${data.cards.pendingOrders.value.toLocaleString('tr-TR')} Adet`}
                            avatarIcon='ri-alarm-line'
                            avatarColor='error'
                            trendNumber=''
                            trend='positive'
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title='Yeni Üye (30 Gün)'
                            stats={`${data.cards.newMembers.value.toLocaleString('tr-TR')} Üye`}
                            avatarIcon='ri-user-add-line'
                            avatarColor='warning'
                            {...trendProps(data.cards.newMembers.trend)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
                <TotalProfitStackedBar profit={data.profit} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Grid container spacing={6}>
                    <Grid size={{ xs: 12 }}>
                        <WebsiteStatistics visits={data.visits} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Transactions items={data.paymentMethods} />
                    </Grid>
                </Grid>
            </Grid>
            <Grid size={{ xs: 12, lg: 8 }} className='order-last lg:order-[unset]'>
                <Table orders={data.recentOrders} />
            </Grid>
        </Grid>
    )
}

export default DashboardECommerce
