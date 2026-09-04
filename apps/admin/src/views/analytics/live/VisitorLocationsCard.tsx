'use client'

// React Imports
import { useMemo } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

// Components Imports
import Link from '@components/Link'
import TurkeyMap from '@views/analytics/shared/TurkeyMap'
import { findProvince } from '@views/analytics/shared/turkeyProvinces'

// Type Imports
import type { LiveVisitorLocation } from './types'
import { formatCount } from './types'

type Props = {
    locations?: LiveVisitorLocation[] | null
    geoAvailable?: boolean
    lang: string
}

// Aktif ziyaretçilerin il düzeyinde dağılımı (harita + şehir chip'leri)
const VisitorLocationsCard = ({ locations, geoAvailable = true, lang }: Props) => {
    // Aynı il farklı yazımlarla gelirse (Istanbul / İstanbul) tek satırda toplanır
    const cities = useMemo(() => {
        const merged = new Map<string, { city: string; count: number }>()

        for (const location of Array.isArray(locations) ? locations : []) {
            const count = Number(location?.count)

            if (!location?.city || !Number.isFinite(count) || count <= 0) continue

            const province = findProvince(location.city)
            const key = province?.name ?? location.city.trim()
            const existing = merged.get(key)

            if (existing) existing.count += count
            else merged.set(key, { city: key, count })
        }

        return Array.from(merged.values()).sort((a, b) => b.count - a.count)
    }, [locations])

    const mapPoints = useMemo(() => cities.map(item => ({ city: item.city, value: item.count })), [cities])

    return (
        <Card className='bs-full'>
            <CardHeader
                title='Ziyaretçi Konumları'
                subheader='Son 2 dakikada aktif ziyaretçiler'
                action={
                    <Typography variant='caption' color='text.disabled' className='pbs-2 pie-2 text-end block'>
                        IP&apos;den il düzeyinde — kişisel veri tutulmaz
                    </Typography>
                }
            />
            <CardContent className='flex flex-col gap-5'>
                {geoAvailable ? (
                    <>
                        <TurkeyMap
                            points={mapPoints}
                            color='success'
                            height={340}
                            valueLabel={value => `${formatCount(value)} ziyaretçi`}
                        />
                        {cities.length === 0 ? (
                            <Typography color='text.secondary'>Şu anda konumu belirlenen ziyaretçi yok.</Typography>
                        ) : (
                            <div className='flex flex-wrap gap-2'>
                                {cities.map(item => (
                                    <Chip
                                        key={item.city}
                                        size='small'
                                        variant='tonal'
                                        color='success'
                                        label={`${item.city}: ${formatCount(item.count)}`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <Alert severity='info' icon={<i className='ri-map-pin-line' />}>
                        Konum verisi için sunucuda geo-ip paketi kurulmalı.
                    </Alert>
                )}
                <Divider />
                <Typography variant='body2' color='text.secondary'>
                    Gün içindeki oturum ve dönüşüm dökümü için{' '}
                    <Link href={`/${lang}/apps/analytics/reports`} className='text-primary font-medium'>
                        Raporlar sayfasına
                    </Link>{' '}
                    bakın.
                </Typography>
            </CardContent>
        </Card>
    )
}

export default VisitorLocationsCard
