'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'

// Type Imports
import type { CountItem } from './types'

// Util Imports
import { formatNumber, formatPercent, toNumber } from './format'

// Component Imports
import EmptyState from './EmptyState'

type BreakdownListProps = {
    title: string
    items?: CountItem[] | null
    note?: string
    limit?: number
}

// Etiket + sayı + ince ilerleme çubuğu listesi (cihaz, konum, yönlendiren, açılış sayfası)
const BreakdownList = ({ title, items, note, limit = 8 }: BreakdownListProps) => {
    const rows = (items ?? [])
        .map(item => ({ label: item.label || 'Bilinmiyor', count: toNumber(item.count) }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)

    const total = rows.reduce((sum, row) => sum + row.count, 0)
    const max = rows.reduce((m, row) => Math.max(m, row.count), 0)

    return (
        <Card className='bs-full'>
            <CardHeader title={title} />
            <CardContent className='flex flex-col gap-4'>
                {note ? (
                    <Typography variant='body2' color='text.secondary' className='flex items-start gap-2'>
                        <i className='ri-information-line text-lg' />
                        {note}
                    </Typography>
                ) : null}
                {rows.length === 0 ? (
                    <EmptyState />
                ) : (
                    rows.map(row => (
                        <div key={row.label} className='flex flex-col gap-1.5'>
                            <div className='flex items-center justify-between gap-4'>
                                <Typography color='text.primary' className='truncate' title={row.label}>
                                    {row.label}
                                </Typography>
                                <div className='flex items-center gap-2 shrink-0'>
                                    <Typography color='text.primary' className='font-medium'>
                                        {formatNumber(row.count)}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='min-is-[3rem] text-end'>
                                        {formatPercent(total > 0 ? (row.count / total) * 100 : 0)}
                                    </Typography>
                                </div>
                            </div>
                            <LinearProgress
                                variant='determinate'
                                color='primary'
                                value={max > 0 ? (row.count / max) * 100 : 0}
                                sx={{ height: 4, borderRadius: 2 }}
                            />
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}

export default BreakdownList
