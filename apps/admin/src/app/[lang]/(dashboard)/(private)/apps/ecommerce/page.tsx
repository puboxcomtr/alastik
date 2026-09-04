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
import CardStatVertical, { CARD_RANGE_LABELS } from '@views/dashboard/Vertical'
import type { CardRange } from '@views/dashboard/Vertical'
import TotalProfitStackedBar from '@views/dashboard/TotalProfitStackedBar'
import Transactions from '@views/dashboard/Transactions'
import WebsiteStatistics from '@views/dashboard/WebsiteStatistics'
import Table from '@views/dashboard/Table'

// Analiz widget'ları (Analizler modülü — ayrı uçtan beslenir, pano yüklemesini engellemez)
import OrderActivityCard from '@views/dashboard/analytics/OrderActivityCard'
import CustomerGrowthCard from '@views/dashboard/analytics/CustomerGrowthCard'
import SeasonSplitCard from '@views/dashboard/analytics/SeasonSplitCard'
import RimSplitCard from '@views/dashboard/analytics/RimSplitCard'
import SalesMapCard from '@views/dashboard/analytics/SalesMapCard'
import TopProductsCard from '@views/dashboard/analytics/TopProductsCard'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { ProfitStats } from '@views/dashboard/TotalProfitStackedBar'
import type { TransactionItem } from '@views/dashboard/Transactions'
import type { VisitStats } from '@views/dashboard/WebsiteStatistics'
import type { RecentOrder } from '@views/dashboard/Table'
import type { OverviewData } from '@views/dashboard/analytics/format'

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
    const [overview, setOverview] = useState<OverviewData | null>(null)

    // Üst kartların dönemi (Bugün / Son 7 Gün / Son 30 Gün); 30 gün pano verisinden gelir, diğerleri ayrıca çekilir
    const [cardRange, setCardRange] = useState<CardRange>('30d')
    const [rangeCards, setRangeCards] = useState<DashboardData['cards'] | null>(null)

    useEffect(() => {
        if (cardRange === '30d') {
            setRangeCards(null)

            return
        }

        let cancelled = false

        const fetchCards = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.analytics.cards(cardRange), { cache: 'no-store' })

                if (cancelled) return

                if (res.success) {
                    setRangeCards(res.data.cards as DashboardData['cards'])
                } else {
                    toast.error(res.message || 'Kart verileri yüklenemedi')
                }
            } catch (error) {
                if (cancelled) return
                console.error('Cards fetch error:', error)
                toast.error('Kart verileri yüklenirken hata oluştu')
            }
        }

        fetchCards()

        return () => {
            cancelled = true
        }
    }, [cardRange])

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

        // Analiz widget'ları ayrı yüklenir; hata verirse yalnızca kendi bölümleri gizlenir
        const fetchOverview = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.analytics.overview(), { cache: 'no-store' })

                if (res.success) {
                    setOverview(res.data as OverviewData)
                } else {
                    toast.error(res.message || 'Analiz verileri yüklenemedi')
                }
            } catch (error) {
                console.error('Overview fetch error:', error)
                toast.error('Analiz verileri yüklenirken hata oluştu')
            }
        }

        fetchDashboard()
        fetchOverview()
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

    const cards = rangeCards ?? data.cards
    const rangeLabel = CARD_RANGE_LABELS[cardRange]

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 12 }}>
                <Grid container spacing={6}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title={`Satış Tutarı (${rangeLabel})`}
                            stats={`${formatTRY(cards.totalSales.value)} TL`}
                            avatarIcon='ri-wallet-2-line'
                            avatarColor='success'
                            activeRange={cardRange}
                            onRangeChange={setCardRange}
                            {...trendProps(cards.totalSales.trend)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title={`Sipariş (${rangeLabel})`}
                            stats={`${cards.totalOrders.value.toLocaleString('tr-TR')} Adet`}
                            avatarIcon='ri-shopping-cart-line'
                            avatarColor='info'
                            activeRange={cardRange}
                            onRangeChange={setCardRange}
                            {...trendProps(cards.totalOrders.trend)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title='Onay Bekleyen Sipariş'
                            stats={`${cards.pendingOrders.value.toLocaleString('tr-TR')} Adet`}
                            avatarIcon='ri-alarm-line'
                            avatarColor='error'
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <CardStatVertical
                            title={`Yeni Üye (${rangeLabel})`}
                            stats={`${cards.newMembers.value.toLocaleString('tr-TR')} Üye`}
                            avatarIcon='ri-user-add-line'
                            avatarColor='warning'
                            activeRange={cardRange}
                            onRangeChange={setCardRange}
                            {...trendProps(cards.newMembers.trend)}
                        />
                    </Grid>
                </Grid>
            </Grid>

            <Grid size={{ xs: 12, md: 12 }}>
                <TotalProfitStackedBar profit={data.profit} />
            </Grid>

            {overview ? (
                <>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <OrderActivityCard activity={overview.orderActivity} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <CustomerGrowthCard growth={overview.customerGrowth} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <SeasonSplitCard split={overview.seasonSplit} window={overview.window} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <RimSplitCard split={overview.rimSplit} window={overview.window} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <SalesMapCard salesMap={overview.salesMap} window={overview.window} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TopProductsCard products={overview.topProducts} />
                    </Grid>
                </>
            ) : null}

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
