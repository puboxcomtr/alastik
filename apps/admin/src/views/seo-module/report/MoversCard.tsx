'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

import type { QueryRow } from '../types'

import { formatDecimal, formatNumber } from '@/views/analytics/reports/format'

import EmptyState from '@/views/analytics/reports/EmptyState'

type MoversCardProps = {
    title: string
    rows: QueryRow[]
    mode: 'up' | 'down' | 'new'
    emptyMessage: string
}

const MoversCard = ({ title, rows, mode, emptyMessage }: MoversCardProps) => {
    const color = mode === 'up' ? 'success' : mode === 'down' ? 'error' : 'info'
    const icon = mode === 'up' ? 'ri-arrow-up-line' : mode === 'down' ? 'ri-arrow-down-line' : 'ri-sparkling-line'

    return (
        <Card className='bs-full'>
            <CardHeader title={title} avatar={<i className={`${icon} text-xl`} />} />
            <CardContent className='flex flex-col gap-3'>
                {rows.length === 0 ? (
                    <EmptyState message={emptyMessage} />
                ) : (
                    rows.map(row => (
                        <div key={row.key} className='flex items-center justify-between gap-3'>
                            <div className='flex flex-col min-is-0'>
                                <Typography className='truncate' title={row.key}>{row.key}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    {formatNumber(row.clicks)} tıklama · {formatNumber(row.impressions)} gösterim
                                </Typography>
                            </div>
                            <div className='flex items-center gap-2 shrink-0'>
                                <Typography className='font-medium' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {formatDecimal(row.position, 1)}
                                </Typography>
                                {mode === 'new' ? (
                                    <Chip label='Yeni' size='small' color='info' variant='tonal' />
                                ) : (
                                    <Chip
                                        label={`${row.delta && row.delta > 0 ? '▲' : '▼'} ${formatDecimal(Math.abs(row.delta || 0), 1)}`}
                                        size='small'
                                        color={color}
                                        variant='tonal'
                                    />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}

export default MoversCard
