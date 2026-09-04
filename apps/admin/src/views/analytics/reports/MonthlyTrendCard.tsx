'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

// Type Imports
import type { MonthlyTrendPoint } from './types'

// Util Imports
import { formatNumber, formatTRY, toNumber } from './format'

// Component Imports
import TimeBarChart from './TimeBarChart'
import EmptyState from './EmptyState'

type MetricKey = 'collected' | 'orders'
type RangeKey = 6 | 12

type MonthlyTrendCardProps = {
    trend?: MonthlyTrendPoint[] | null
}

// Son 12 ayın tahsilat / sipariş sayısı trendi; metrik ve aralık toggle'ları
const MonthlyTrendCard = ({ trend }: MonthlyTrendCardProps) => {
    const [metric, setMetric] = useState<MetricKey>('collected')
    const [range, setRange] = useState<RangeKey>(12)

    const points = (trend ?? []).slice(-range)
    const categories = points.map(p => p.label)
    const values = points.map(p => toNumber(metric === 'collected' ? p.collected : p.orders))
    const hasData = values.some(v => v > 0)

    const seriesName = metric === 'collected' ? 'Tahsil Edilen' : 'Sipariş Sayısı'

    return (
        <Card>
            <CardHeader
                title='Aylık Trend'
                subheader={range === 6 ? 'Son 6 ay' : 'Son 12 ay'}
                action={
                    <div className='flex flex-wrap items-center gap-3 plb-1'>
                        <ToggleButtonGroup
                            size='small'
                            color='primary'
                            exclusive
                            value={metric}
                            onChange={(_, value: MetricKey | null) => {
                                if (value) setMetric(value)
                            }}
                        >
                            <ToggleButton value='collected'>Tahsil Edilen</ToggleButton>
                            <ToggleButton value='orders'>Sipariş Sayısı</ToggleButton>
                        </ToggleButtonGroup>
                        <ToggleButtonGroup
                            size='small'
                            color='primary'
                            exclusive
                            value={range}
                            onChange={(_, value: RangeKey | null) => {
                                if (value) setRange(value)
                            }}
                        >
                            <ToggleButton value={6}>6 Ay</ToggleButton>
                            <ToggleButton value={12}>1 Yıl</ToggleButton>
                        </ToggleButtonGroup>
                    </div>
                }
            />
            <CardContent>
                {hasData ? (
                    <TimeBarChart
                        categories={categories}
                        values={values}
                        seriesName={seriesName}
                        valueFormatter={value => (metric === 'collected' ? formatTRY(value) : `${formatNumber(value)} sipariş`)}
                        axisFormatter={metric === 'collected' ? undefined : value => formatNumber(value)}
                        height={300}
                    />
                ) : (
                    <EmptyState message='Henüz aylık veri yok' minHeight={200} />
                )}
            </CardContent>
        </Card>
    )
}

export default MonthlyTrendCard
