'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatTRY, formatInt } from './format'
import type { OverviewData } from './format'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// Mevsim başına sabit renk: sıralama değişse de renk aynı kalır
const SEASON_COLORS: Record<string, string> = {
    yaz: 'var(--mui-palette-warning-main)',
    kis: 'var(--mui-palette-info-main)',
    '4mevsim': 'var(--mui-palette-success-main)'
}
const SEASON_ORDER = ['yaz', 'kis', '4mevsim']

// Mevsime göre satış payı (ürün adından türetilir)
const SeasonSplitCard = ({ split, window }: { split: OverviewData['seasonSplit']; window: string }) => {
    const items = [...split.items].sort((a, b) => SEASON_ORDER.indexOf(a.key) - SEASON_ORDER.indexOf(b.key))
    const hasData = items.length > 0 && split.totalUnits > 0

    const options = {
        chart: { parentHeightOffset: 0, toolbar: { show: false } },
        labels: items.map(i => i.label),
        colors: items.map(i => SEASON_COLORS[i.key] || 'var(--mui-palette-secondary-main)'),
        stroke: { width: 2, colors: ['var(--mui-palette-background-paper)'] },
        legend: { show: false },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (value: number) => `${formatInt(value)} adet` } },
        plotOptions: {
            pie: {
                donut: {
                    size: '72%',
                    labels: {
                        show: true,
                        name: { show: true, color: 'var(--mui-palette-text-secondary)', fontSize: '0.8125rem' },
                        value: { show: true, color: 'var(--mui-palette-text-primary)', fontSize: '1.5rem', fontWeight: 600, formatter: (v: string) => formatInt(Number(v)) },
                        total: { show: true, label: 'adet satış', color: 'var(--mui-palette-text-secondary)', formatter: () => formatInt(split.totalUnits) }
                    }
                }
            }
        }
    }

    return (
        <Card className='bs-full'>
            <CardHeader title='Satış Dağılımı' subheader={`Mevsime göre satış adedi payı · son ${window === '12ay' ? '12 ay' : window}`} />
            <CardContent className='flex flex-col gap-4'>
                {hasData ? (
                    <>
                        <AppReactApexCharts type='donut' height={210} width='100%' series={items.map(i => i.units)} options={options} />
                        <div className='flex flex-col gap-2'>
                            {items.map(item => (
                                <div key={item.key} className='flex items-center justify-between gap-3'>
                                    <div className='flex items-center gap-2'>
                                        <span style={{ width: 10, height: 10, borderRadius: 5, background: SEASON_COLORS[item.key] || 'var(--mui-palette-secondary-main)', display: 'inline-block' }} />
                                        <Typography color='text.primary'>{item.label}</Typography>
                                    </div>
                                    <div className='flex items-center gap-3'>
                                        <Typography className='font-medium' color='text.primary'>{`${formatTRY(item.revenue)} TL`}</Typography>
                                        <Typography variant='body2' color='text.secondary'>{`%${item.share}`}</Typography>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <Typography color='text.secondary'>Bu dönemde satış verisi yok.</Typography>
                )}
            </CardContent>
        </Card>
    )
}

export default SeasonSplitCard
