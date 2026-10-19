'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { HourDensity } from './types'

import { formatDecimal, toNumber } from './format'

import TimeBarChart from './TimeBarChart'
import EmptyState from './EmptyState'

type HourDensityChartProps = {
    density?: HourDensity | null
}

const padHour = (hour: number) => `${hour}`.padStart(2, '0')

const HourDensityChart = ({ density }: HourDensityChartProps) => {
    const theme = useTheme()

    const values = Array.from({ length: 24 }, (_, hour) => {
        const point = (density?.hours ?? []).find(h => toNumber(h.hour) === hour)

        return toNumber(point?.avg)
    })

    const categories = values.map((_, hour) => `${padHour(hour)}:00`)
    const hasData = values.some(v => v > 0)

    const peakHour = Math.min(23, Math.max(0, Math.round(toNumber(density?.peakHour))))
    const barColors = values.map((_, hour) => (hour === peakHour ? theme.palette.warning.main : theme.palette.primary.main))

    return (
        <Card>
            <CardHeader
                title='Günün Saatine Göre Yoğunluk'
                subheader='Saat başına ortalama oturum'
                action={
                    hasData ? (
                        <Typography color='text.secondary' className='flex items-center gap-2 plb-2'>
                            <i className='ri-time-line text-xl text-warning' />
                            {`En yoğun saat: ${padHour(peakHour)}:00 — günde ort. ${formatDecimal(toNumber(density?.avgPerDay), 1)} oturum`}
                        </Typography>
                    ) : undefined
                }
            />
            <CardContent>
                {hasData ? (
                    <TimeBarChart
                        categories={categories}
                        values={values}
                        seriesName='Ortalama oturum'
                        valueFormatter={value => `${formatDecimal(value, 1)} oturum`}
                        axisFormatter={value => formatDecimal(value, 0)}
                        barColors={barColors}
                        height={260}
                    />
                ) : (
                    <EmptyState minHeight={200} />
                )}
            </CardContent>
        </Card>
    )
}

export default HourDensityChart
