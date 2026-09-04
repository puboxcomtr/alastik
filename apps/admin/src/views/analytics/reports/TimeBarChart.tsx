'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'

// Util Imports
import { formatCompact } from './format'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type TimeBarChartProps = {
    categories: string[]
    values: number[]
    seriesName: string
    valueFormatter: (value: number) => string
    axisFormatter?: (value: number) => string
    barColors?: string[]
    height?: number
}

// Tek serili, ince çubuklu zaman grafiği (tek eksen, tooltip açık, legend yok)
const TimeBarChart = ({
    categories,
    values,
    seriesName,
    valueFormatter,
    axisFormatter = formatCompact,
    barColors,
    height = 300
}: TimeBarChartProps) => {
    const theme = useTheme()

    const distributed = Boolean(barColors && barColors.length > 0)
    const colors = distributed && barColors ? barColors : [theme.palette.primary.main]
    const labelStyle = { colors: theme.palette.text.disabled, fontSize: String(theme.typography.body2.fontSize) }

    const options: ApexOptions = {
        chart: {
            parentHeightOffset: 0,
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: theme.typography.fontFamily
        },
        plotOptions: {
            bar: {
                columnWidth: categories.length > 20 ? '55%' : '40%',
                borderRadius: 4,
                borderRadiusApplication: 'end',
                distributed
            }
        },
        colors,
        dataLabels: { enabled: false },
        legend: { show: false },
        stroke: {
            show: true,
            width: 2,
            colors: [theme.palette.background.paper]
        },
        grid: {
            borderColor: theme.palette.divider,
            strokeDashArray: 0,
            xaxis: { lines: { show: false } },
            padding: { top: -10, left: 0, right: 0, bottom: -5 }
        },
        xaxis: {
            categories,
            axisTicks: { show: false },
            axisBorder: { show: false },
            tooltip: { enabled: false },
            labels: {
                rotate: 0,
                hideOverlappingLabels: true,
                style: labelStyle
            }
        },
        yaxis: {
            tickAmount: 4,
            labels: {
                formatter: (value: number) => axisFormatter(value),
                style: labelStyle
            }
        },
        tooltip: {
            theme: theme.palette.mode,
            y: {
                formatter: (value: number) => valueFormatter(value),
                title: { formatter: () => `${seriesName}:` }
            }
        }
    }

    const series = [{ name: seriesName, data: values }]

    return <AppReactApexCharts type='bar' width='100%' height={height} series={series} options={options} />
}

export default TimeBarChart
