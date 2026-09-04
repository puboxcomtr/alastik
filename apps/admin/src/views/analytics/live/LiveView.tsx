'use client'

// React Imports
import { useCallback, useEffect, useRef, useState } from 'react'

// Next Imports
import { useParams } from 'next/navigation'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import { toast } from 'react-toastify'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import CustomerBehaviorCard from './CustomerBehaviorCard'
import RecentSalesCard from './RecentSalesCard'
import VisitorLocationsCard from './VisitorLocationsCard'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { LiveAnalyticsData } from './types'
import { formatCount, formatTRY } from './types'

const REFRESH_INTERVAL_MS = 10_000

const formatClock = (date: Date) =>
    date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const resolveUpdatedAt = (data: LiveAnalyticsData | null): Date | null => {
    if (!data?.updatedAt) return null

    const date = new Date(data.updatedAt)

    return Number.isNaN(date.getTime()) ? null : date
}

// Küçük istatistik kartı (ikon + başlık + değer)
const SmallStatCard = ({
    title,
    value,
    icon,
    color
}: {
    title: string
    value: string
    icon: string
    color: ThemeColor
}) => (
    <Card className='bs-full'>
        <CardContent className='flex items-center gap-4'>
            <CustomAvatar color={color} skin='light' size={42} className='shadow-xs'>
                <i className={icon} />
            </CustomAvatar>
            <div className='flex flex-col gap-0.5'>
                <Typography variant='body2' color='text.secondary'>
                    {title}
                </Typography>
                <Typography variant='h5'>{value}</Typography>
            </div>
        </CardContent>
    </Card>
)

const LiveView = () => {
    const theme = useTheme()
    const params = useParams()
    const langParam = params?.lang
    const lang = (Array.isArray(langParam) ? langParam[0] : langParam) || 'tr'

    const [data, setData] = useState<LiveAnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const inFlightRef = useRef(false)
    const errorShownRef = useRef(false)

    const fetchLive = useCallback(async () => {
        if (inFlightRef.current) return

        inFlightRef.current = true

        try {
            const res = await fetchAPI(API_ENDPOINTS.analytics.live(), { cache: 'no-store' })

            if (res.success) {
                setData(res.data as LiveAnalyticsData)
                setLastFetchedAt(new Date())
                errorShownRef.current = false
            } else if (!errorShownRef.current) {
                errorShownRef.current = true
                toast.error(res.message || 'Canlı izleme verileri yüklenemedi')
            }
        } catch (error) {
            console.error('Live analytics fetch error:', error)

            if (!errorShownRef.current) {
                errorShownRef.current = true
                toast.error('Canlı izleme verileri yüklenirken hata oluştu')
            }
        } finally {
            inFlightRef.current = false
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLive()

        intervalRef.current = setInterval(() => {
            // Sekme görünmezken ağ isteği yapma
            if (typeof document !== 'undefined' && document.hidden) return

            fetchLive()
        }, REFRESH_INTERVAL_MS)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [fetchLive])

    if (loading && !data) {
        return (
            <div className='flex items-center justify-center gap-3' style={{ minHeight: '300px' }}>
                <CircularProgress size={28} />
                <Typography>Canlı izleme verileri yükleniyor...</Typography>
            </div>
        )
    }

    if (!data) {
        return <Typography color='text.secondary'>Canlı izleme verileri yüklenemedi.</Typography>
    }

    const updatedAt = resolveUpdatedAt(data) ?? lastFetchedAt

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
                    <Typography variant='h4'>Canlı İzleme</Typography>
                    <div className='flex items-center gap-2'>
                        <Box
                            component='span'
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: theme.palette.success.main,
                                boxShadow: `0 0 0 3px ${theme.palette.success.lightOpacity ?? 'transparent'}`,
                                display: 'inline-block'
                            }}
                        />
                        <Typography variant='body2' color='text.secondary'>
                            {`Son güncelleme: ${updatedAt ? formatClock(updatedAt) : '—'} · 10 sn'de bir yenilenir`}
                        </Typography>
                    </div>
                </div>
            </Grid>

            {/* Sol sütun */}
            <Grid size={{ xs: 12, md: 5 }}>
                <Grid container spacing={6}>
                    <Grid size={{ xs: 12 }}>
                        <Card>
                            <CardContent className='flex flex-col gap-1'>
                                <div className='flex items-center justify-between'>
                                    <Typography color='text.secondary'>Şu Anki Ziyaretçiler</Typography>
                                    <CustomAvatar color='success' skin='light' variant='rounded' size={42}>
                                        <i className='ri-user-3-line' />
                                    </CustomAvatar>
                                </div>
                                <Typography variant='h1' color='text.primary' sx={{ lineHeight: 1.15 }}>
                                    {formatCount(Number(data.activeVisitors))}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    Son 2 dakikada aktif
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <SmallStatCard
                            title='Son 30 dk Oturum'
                            value={formatCount(Number(data.sessions30m))}
                            icon='ri-time-line'
                            color='info'
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <SmallStatCard
                            title='Bugünkü Sipariş'
                            value={`${formatCount(Number(data.ordersToday))} Adet`}
                            icon='ri-shopping-cart-line'
                            color='primary'
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <SmallStatCard
                            title='Bugün Tahsil Edilen'
                            value={`${formatTRY(Number(data.collectedToday))} TL`}
                            icon='ri-wallet-2-line'
                            color='success'
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <CustomerBehaviorCard behavior={data.behavior15m} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <RecentSalesCard sales={data.recentSales} />
                    </Grid>
                </Grid>
            </Grid>

            {/* Sağ sütun */}
            <Grid size={{ xs: 12, md: 7 }}>
                <VisitorLocationsCard
                    locations={data.visitorLocations}
                    geoAvailable={data.geoAvailable !== false}
                    lang={lang}
                />
            </Grid>
        </Grid>
    )
}

export default LiveView
