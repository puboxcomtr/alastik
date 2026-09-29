'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'

// Type Imports
import type { ReportData } from '../types'

// Util Imports
import { formatNumber, formatPercent } from '@/views/analytics/reports/format'

const BUCKETS: { key: keyof ReportData['buckets']; label: string; color: 'primary' }[] = [
    { key: 'top3', label: 'İlk 3', color: 'primary' },
    { key: 'top10', label: '4 - 10', color: 'primary' },
    { key: 'top50', label: '11 - 50', color: 'primary' },
    { key: 'beyond', label: '50 ve sonrası', color: 'primary' }
]

// Dönemde gösterim alan sorguların ortalama pozisyona göre dağılımı
const PositionBucketsCard = ({ buckets, totalQueries }: { buckets: ReportData['buckets']; totalQueries: number }) => {
    const total = BUCKETS.reduce((sum, b) => sum + (buckets[b.key] || 0), 0)

    return (
        <Card className='bs-full'>
            <CardHeader title='Pozisyon dağılımı' subheader={`${formatNumber(totalQueries)} sorgu gösterim aldı`} />
            <CardContent className='flex flex-col gap-4'>
                {BUCKETS.map(b => {
                    const count = buckets[b.key] || 0
                    const share = total > 0 ? (count / total) * 100 : 0

                    return (
                        <div key={b.key} className='flex flex-col gap-1.5'>
                            <div className='flex items-center justify-between gap-4'>
                                <Typography>{b.label}</Typography>
                                <div className='flex items-center gap-2'>
                                    <Typography className='font-medium' sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(count)}</Typography>
                                    <Typography variant='body2' color='text.secondary' className='min-is-[3rem] text-end'>{formatPercent(share)}</Typography>
                                </div>
                            </div>
                            <LinearProgress variant='determinate' color={b.color} value={share} sx={{ height: 6, borderRadius: 3 }} />
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}

export default PositionBucketsCard
