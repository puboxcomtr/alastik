'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Type Imports
import type { ReportData, SeoPeriodSelection, SyncState } from '../types'
import { SEO_PERIOD_LABELS, buildPeriodQuery } from '../types'

// Util Imports
import { formatDecimal, formatNumber, formatPercent } from '@/views/analytics/reports/format'
import { getSiteUrl } from '@/utils/activeSite'

// Component Imports
import SeoTabs from '../SeoTabs'
import SeoPeriodSelector from '../SeoPeriodSelector'
import SetupCard from './SetupCard'
import MoversCard from './MoversCard'
import QueryTableCard from './QueryTableCard'
import PositionBucketsCard from './PositionBucketsCard'
import KpiCard from '@/views/analytics/reports/KpiCard'
import TimeBarChart from '@/views/analytics/reports/TimeBarChart'
import EmptyState from '@/views/analytics/reports/EmptyState'

const SYNC_POLL_MS = 4000

const formatRange = (start: string, end: string) => {
    const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

    return start === end ? fmt(start) : `${fmt(start)} - ${fmt(end)}`
}

// Sayfa URL'lerini kısa yol olarak göster (https://alastik.com/urun/x → /urun/x)
const pathOf = (url: string) => {
    try { return new URL(url).pathname || url } catch { return url }
}

const SeoReportView = () => {
    const { lang: locale } = useParams()
    const [period, setPeriod] = useState<SeoPeriodSelection>({ key: '30d' })
    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [metric, setMetric] = useState<'clicks' | 'impressions'>('clicks')

    const fetchReport = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.report(buildPeriodQuery(period)), { cache: 'no-store' })

            if (res.success) setData(res.data as ReportData)
            else toast.error(res.message || 'SEO raporu yüklenemedi')
        } catch (error) {
            console.error('SEO report fetch error:', error)
            toast.error(error instanceof Error ? error.message : 'SEO raporu yüklenirken hata oluştu')
        } finally {
            if (!silent) setLoading(false)
        }
    }, [period])

    useEffect(() => {
        fetchReport()
    }, [fetchReport])

    // Arka plandaki çekim bitene kadar rapor sessizce yenilenir
    const sync: SyncState = data?.source?.sync ?? null

    useEffect(() => {
        if (!sync?.running) return

        const timer = setInterval(() => fetchReport(true), SYNC_POLL_MS)

        return () => clearInterval(timer)
    }, [sync?.running, fetchReport])

    const handleSync = async (days: number) => {
        setSyncing(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.reportSync(), { method: 'POST', body: JSON.stringify({ days }) })

            if (res.success) {
                toast.success(res.message || 'Çekim başlatıldı')
                await fetchReport(true)
            } else {
                toast.error(res.message || 'Çekim başlatılamadı')
                await fetchReport(true)
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Çekim başlatılamadı')
        } finally {
            setSyncing(false)
        }
    }

    const hasData = Boolean(data?.source?.hasData)
    const subtitle = data?.period
        ? `Google Search Console · ${formatRange(data.period.start, data.period.end)}${data.source.latestDate ? ` · son veri günü ${formatRange(data.source.latestDate, data.source.latestDate)}` : ''}`
        : SEO_PERIOD_LABELS[period.key]

    const seriesValues = (data?.series ?? []).map(p => (metric === 'clicks' ? p.clicks : p.impressions))
    const seriesHasData = seriesValues.some(v => v > 0)
    const siteUrl = getSiteUrl()

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <SeoTabs active='report' />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <SeoPeriodSelector
                    title='Genel Rapor'
                    subtitle={subtitle}
                    value={period}
                    onChange={setPeriod}
                    action={hasData ? (
                        <Button size='small' variant='outlined' color='secondary' startIcon={sync?.running ? <CircularProgress size={14} /> : <i className='ri-refresh-line' />} disabled={syncing || Boolean(sync?.running)} onClick={() => handleSync(14)}>
                            {sync?.running ? `Çekiliyor ${sync.done}/${sync.total}` : 'Güncelle'}
                        </Button>
                    ) : null}
                />
            </Grid>

            {loading ? (
                <Grid size={{ xs: 12 }}>
                    <div className='flex items-center justify-center gap-3' style={{ minHeight: 300 }}>
                        <CircularProgress size={28} />
                        <Typography>SEO raporu yükleniyor...</Typography>
                    </div>
                </Grid>
            ) : !data ? (
                <Grid size={{ xs: 12 }}>
                    <Typography color='text.secondary'>SEO raporu yüklenemedi.</Typography>
                </Grid>
            ) : !hasData ? (
                <Grid size={{ xs: 12 }}>
                    <SetupCard source={data.source} onSync={handleSync} syncing={syncing} />
                </Grid>
            ) : (
                <>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <KpiCard title='Tıklama' value={formatNumber(data.totals.clicks)} icon='ri-cursor-line' color='primary' trend={data.totals.clicksTrend} subtitle={`Önceki dönem ${formatNumber(data.totals.previous.clicks)}`} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <KpiCard title='Gösterim' value={formatNumber(data.totals.impressions)} icon='ri-eye-line' color='primary' trend={data.totals.impressionsTrend} subtitle={`Önceki dönem ${formatNumber(data.totals.previous.impressions)}`} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <KpiCard title='CTR' value={formatPercent(data.totals.ctr)} icon='ri-percent-line' color='primary' subtitle={`Önceki dönem ${formatPercent(data.totals.previous.ctr)} (${data.totals.ctrDelta >= 0 ? '+' : ''}${formatDecimal(data.totals.ctrDelta, 1)} puan)`} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <KpiCard title='Ortalama pozisyon' value={formatDecimal(data.totals.position, 1)} icon='ri-award-line' color='primary' subtitle={data.totals.previous.position ? `Önceki dönem ${formatDecimal(data.totals.previous.position, 1)} (${data.totals.positionDelta >= 0 ? '▲' : '▼'} ${formatDecimal(Math.abs(data.totals.positionDelta), 1)})` : 'Önceki dönemde veri yok'} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Card>
                            <CardHeader
                                title='Zaman içinde'
                                subheader={data.period.granularity === 'month' ? 'Aylık toplam' : 'Günlük toplam'}
                                action={
                                    <ButtonGroup size='small' variant='outlined'>
                                        <Button variant={metric === 'clicks' ? 'contained' : 'outlined'} onClick={() => setMetric('clicks')}>Tıklama</Button>
                                        <Button variant={metric === 'impressions' ? 'contained' : 'outlined'} onClick={() => setMetric('impressions')}>Gösterim</Button>
                                    </ButtonGroup>
                                }
                            />
                            <CardContent>
                                {seriesHasData ? (
                                    <TimeBarChart
                                        categories={data.series.map(p => p.label)}
                                        values={seriesValues}
                                        seriesName={metric === 'clicks' ? 'Tıklama' : 'Gösterim'}
                                        valueFormatter={v => formatNumber(v)}
                                    />
                                ) : (
                                    <EmptyState />
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <MoversCard title='Yükselen kelimeler' rows={data.queries.winners} mode='up' emptyMessage='Önceki döneme göre yükselen sorgu yok' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <MoversCard title='Düşen kelimeler' rows={data.queries.losers} mode='down' emptyMessage='Önceki döneme göre düşen sorgu yok' />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <MoversCard title='Yeni gelen sorgular' rows={data.queries.fresh} mode='new' emptyMessage='Bu dönemde yeni sorgu yok' />
                    </Grid>

                    <Grid size={{ xs: 12, md: 5 }}>
                        <PositionBucketsCard buckets={data.buckets} totalQueries={data.queries.total} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Card className='bs-full'>
                            <CardHeader
                                title='Takip edilen kelimeler'
                                subheader={data.tracked.length ? `${data.tracked.length} kelime izleniyor` : 'Henüz kelime eklenmedi'}
                                action={<Button component={Link} href={`/${locale}/apps/seo/keywords`} size='small' variant='outlined'>Tümünü gör</Button>}
                            />
                            <CardContent className='flex flex-col gap-3'>
                                {data.tracked.length === 0 ? (
                                    <EmptyState message='Anahtar Kelimeler sekmesinden takip listesi oluşturun' />
                                ) : (
                                    data.tracked.slice(0, 8).map(k => (
                                        <div key={k._id} className='flex items-center justify-between gap-3'>
                                            <Typography className='truncate' title={k.keyword}>{k.keyword}</Typography>
                                            <div className='flex items-center gap-2 shrink-0'>
                                                <Typography variant='body2' color='text.secondary'>{formatNumber(k.clicks)} tıklama</Typography>
                                                <Typography className='font-medium' sx={{ fontVariantNumeric: 'tabular-nums' }}>{k.position === null ? '—' : formatDecimal(k.position, 1)}</Typography>
                                                {k.delta !== null && Math.abs(k.delta) >= 0.5 ? (
                                                    <Chip size='small' variant='tonal' color={k.delta > 0 ? 'success' : 'error'} label={`${k.delta > 0 ? '▲' : '▼'} ${formatDecimal(Math.abs(k.delta), 1)}`} />
                                                ) : (
                                                    <Chip size='small' variant='tonal' color='default' label='—' />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 6 }}>
                        <QueryTableCard title='En çok tıklanan sorgular' keyLabel='Sorgu' rows={data.queries.top} />
                    </Grid>
                    <Grid size={{ xs: 12, lg: 6 }}>
                        <QueryTableCard title='En çok tıklanan sayfalar' keyLabel='Sayfa' rows={data.pages} formatKey={pathOf} href={key => (key.startsWith('http') ? key : `${siteUrl}${key}`)} />
                    </Grid>
                </>
            )}
        </Grid>
    )
}

export default SeoReportView
