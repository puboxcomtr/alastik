'use client'

import { useEffect, useState } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { PeriodSelection, ReportsData } from './types'

import { formatDateLong, formatNumber, formatPercent, formatTRY, toNumber } from './format'

import PeriodSelector, { PERIOD_LABELS } from './PeriodSelector'
import KpiCard from './KpiCard'
import TimeBarChart from './TimeBarChart'
import SalesBreakdownList from './SalesBreakdownList'
import FunnelSteps from './FunnelSteps'
import HourDensityChart from './HourDensityChart'
import BreakdownList from './BreakdownList'
import MonthlyTrendCard from './MonthlyTrendCard'
import TopProductsTable from './TopProductsTable'
import EmptyState from './EmptyState'

const buildQuery = (selection: PeriodSelection): string => {
    if (selection.key === 'custom' && selection.from && selection.to) {
        const params = new URLSearchParams({ period: 'custom', from: selection.from, to: selection.to })

        return params.toString()
    }

    return `period=${selection.key}`
}

const ReportsView = () => {
    const [period, setPeriod] = useState<PeriodSelection>({ key: 'month' })
    const [data, setData] = useState<ReportsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const fetchReports = async () => {
            setLoading(true)

            try {
                const res = await fetchAPI(API_ENDPOINTS.analytics.reports(buildQuery(period)), { cache: 'no-store' })

                if (cancelled) return

                if (res.success) {
                    setData(res.data as ReportsData)
                } else {
                    toast.error(res.message || 'Rapor verileri yüklenemedi')
                }
            } catch (error) {
                if (cancelled) return
                console.error('Reports fetch error:', error)
                toast.error(error instanceof Error ? error.message : 'Rapor verileri yüklenirken hata oluştu')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchReports()

        return () => {
            cancelled = true
        }
    }, [period])

    const periodLabel = data?.period?.label || PERIOD_LABELS[period.key]
    const kpis = data?.kpis
    const sessionsSince = formatDateLong(data?.period?.sessionsSince)

    const collectedPoints = data?.collectedOverTime ?? []
    const sessionPoints = data?.sessionsOverTime ?? []
    const collectedHasData = collectedPoints.some(p => toNumber(p.value) > 0)
    const sessionsHasData = sessionPoints.some(p => toNumber(p.value) > 0)

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <PeriodSelector value={period} periodLabel={periodLabel} onChange={setPeriod} />
            </Grid>

            {loading ? (
                <Grid size={{ xs: 12 }}>
                    <div className='flex items-center justify-center gap-3' style={{ minHeight: '300px' }}>
                        <CircularProgress size={28} />
                        <Typography>Rapor verileri yükleniyor...</Typography>
                    </div>
                </Grid>
            ) : !data ? (
                <Grid size={{ xs: 12 }}>
                    <Typography color='text.secondary'>Rapor verileri yüklenemedi.</Typography>
                </Grid>
            ) : (
                <>
                    <Grid size={{ xs: 12 }}>
                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                                <KpiCard
                                    title='Tahsil Edilen'
                                    value={formatTRY(toNumber(kpis?.collected))}
                                    icon='ri-wallet-2-line'
                                    color='success'
                                    trend={kpis?.collectedTrend}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                                <KpiCard
                                    title='Ortalama Sepet'
                                    value={formatTRY(toNumber(kpis?.avgBasket))}
                                    icon='ri-shopping-basket-line'
                                    color='primary'
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                                <KpiCard
                                    title='İptal'
                                    value={`${formatNumber(toNumber(kpis?.cancelled))} Adet`}
                                    icon='ri-close-circle-line'
                                    color='error'
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                                <KpiCard
                                    title='Sipariş'
                                    value={`${formatNumber(toNumber(kpis?.orders))} Adet`}
                                    icon='ri-shopping-cart-line'
                                    color='info'
                                    trend={kpis?.ordersTrend}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                                <KpiCard
                                    title='Satılan Adet'
                                    value={`${formatNumber(toNumber(kpis?.unitsSold))} Adet`}
                                    icon='ri-box-3-line'
                                    color='warning'
                                />
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <KpiCard
                                    title='Oturumlar'
                                    value={formatNumber(toNumber(kpis?.sessions))}
                                    icon='ri-group-line'
                                    color='primary'
                                    trend={kpis?.sessionsTrend}
                                    subtitle={sessionsSince ? `${sessionsSince} tarihinden beri toplanıyor` : undefined}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <KpiCard
                                    title='Dönüşüm Oranı'
                                    value={formatPercent(toNumber(kpis?.conversionRate))}
                                    icon='ri-exchange-funds-line'
                                    color='success'
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <KpiCard
                                    title='Geri Dönen Müşteri'
                                    value={formatPercent(toNumber(kpis?.returningCustomerRate))}
                                    icon='ri-user-heart-line'
                                    color='info'
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <KpiCard
                                    title='Gönderilen Sipariş'
                                    value={`${formatNumber(toNumber(kpis?.shippedOrders))} Adet`}
                                    icon='ri-truck-line'
                                    color='warning'
                                />
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Card>
                            <Grid container>
                                <Grid size={{ xs: 12, md: 8 }} className='border-be md:border-be-0 md:border-ie'>
                                    <CardHeader title='Zamana Göre Tahsilat' subheader={periodLabel} />
                                    <CardContent>
                                        {collectedHasData ? (
                                            <TimeBarChart
                                                categories={collectedPoints.map(p => p.label)}
                                                values={collectedPoints.map(p => toNumber(p.value))}
                                                seriesName='Tahsil edilen'
                                                valueFormatter={formatTRY}
                                                height={300}
                                            />
                                        ) : (
                                            <EmptyState minHeight={260} />
                                        )}
                                    </CardContent>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <CardHeader title='Toplam Satış Dökümü' subheader='Seçili dönem' />
                                    <CardContent className='!pbs-0'>
                                        <SalesBreakdownList breakdown={data.salesBreakdown} />
                                    </CardContent>
                                </Grid>
                            </Grid>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Card>
                            <Grid container>
                                <Grid size={{ xs: 12, md: 8 }} className='border-be md:border-be-0 md:border-ie'>
                                    <CardHeader title='Zamana Göre Oturumlar' subheader={periodLabel} />
                                    <CardContent>
                                        {sessionsHasData ? (
                                            <TimeBarChart
                                                categories={sessionPoints.map(p => p.label)}
                                                values={sessionPoints.map(p => toNumber(p.value))}
                                                seriesName='Oturum'
                                                valueFormatter={value => `${formatNumber(value)} oturum`}
                                                axisFormatter={value => formatNumber(Math.round(value))}
                                                height={300}
                                            />
                                        ) : (
                                            <EmptyState minHeight={260} />
                                        )}
                                    </CardContent>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <CardHeader title='Dönüşüm Dökümü' subheader='Oturumdan siparişe' />
                                    <CardContent className='!pbs-0'>
                                        <FunnelSteps funnel={data.funnel} />
                                    </CardContent>
                                </Grid>
                            </Grid>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <HourDensityChart density={data.hourDensity} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                        <BreakdownList title='Cihaz Türüne Göre Oturumlar' items={data.byDevice} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                        <BreakdownList
                            title='Konuma Göre Oturumlar'
                            items={data.byCity}
                            note={data.geoAvailable === false ? 'Konum verisi için geo-ip paketi kurulmalı' : undefined}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                        <BreakdownList title='Yönlendirene Göre Oturumlar' items={data.byReferrer} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                        <BreakdownList title='Açılış Sayfasına Göre Oturumlar' items={data.byLandingPage} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <MonthlyTrendCard trend={data.monthlyTrend} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TopProductsTable products={data.topProducts} />
                    </Grid>
                </>
            )}
        </Grid>
    )
}

export default ReportsView
