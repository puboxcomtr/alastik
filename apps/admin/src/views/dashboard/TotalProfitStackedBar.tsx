'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

export type ProfitStats = {
    dailySeries: { date: string; label: string; total: number }[]
    monthTotal: number
    confirmedCount: number
    cancelledCount: number
    todayTotal: number
}

const formatTRY = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TotalProfitStackedBar = ({ profit }: { profit?: ProfitStats }) => {
    const theme = useTheme()
    const { lang: locale } = useParams()
    const disabledText = 'var(--mui-palette-text-disabled)'

    const dailySeries = profit?.dailySeries || []

    const summary = [
        {
            title: `${(profit?.confirmedCount || 0).toLocaleString('tr-TR')} Adet`,
            avatarColor: 'secondary' as const,
            subtitle: 'Ödemesi Alınan Sipariş (Bu Ay)',
            icon: 'ri-pie-chart-2-line'
        },
        {
            title: `${(profit?.cancelledCount || 0).toLocaleString('tr-TR')} Adet`,
            avatarColor: 'secondary' as const,
            subtitle: 'İptal Edilen Sipariş (Bu Ay)',
            icon: 'ri-close-circle-line'
        },
        {
            title: `${formatTRY(profit?.todayTotal || 0)} TL`,
            avatarColor: 'secondary' as const,
            subtitle: 'Günlük Kazanç',
            icon: 'ri-bank-card-line'
        }
    ]

    const options = {
        chart: {
            stacked: true,
            parentHeightOffset: 0,
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                columnWidth: '35%',
                borderRadiusApplication: 'around',
                borderRadiusWhenStacked: 'all'
            }
        },
        colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-success-main)', 'var(--mui-palette-secondary-main)'],
        grid: {
            strokeDashArray: 10,
            padding: { top: -20, left: -3, bottom: -10 },
            xaxis: { lines: { show: false } },
            borderColor: 'var(--mui-palette-divider)'
        },
        legend: { show: false },
        dataLabels: { enabled: false },
        stroke: {
            width: 6,
            curve: 'smooth',
            lineCap: 'round',
            colors: ['var(--mui-palette-background-paper)']
        },
        states: {
            hover: { filter: { type: 'none' } },
            active: { filter: { type: 'none' } }
        },
        xaxis: {
            axisTicks: { show: false },
            axisBorder: { show: false },
            categories: dailySeries.map(d => d.label),
            labels: {
                style: { colors: disabledText, fontSize: theme.typography.body2.fontSize }
            }
        },
        yaxis: {
            labels: {
                offsetY: 2,
                offsetX: -15,
                formatter: (value: number) => (value > 999 ? `${(value / 1000).toFixed(0)}k` : `${value}`),
                style: { colors: disabledText, fontSize: theme.typography.body2.fontSize }
            }
        }
    }

    const series = [
        {
            name: 'Günlük Kazanç',
            data: dailySeries.map(d => d.total)
        }
    ]

    return (
        <Card>
            <Grid container>
                <Grid size={{ xs: 12, sm: 7 }} className='border-be sm:border-be-0 sm:border-ie'>
                    <CardHeader title='Siparişler' subheader='Son 14 Gün' />
                    <CardContent sx={{ '& .apexcharts-xcrosshairs.apexcharts-active': { opacity: 0 } }}>
                        <AppReactApexCharts type='bar' width='100%' height={292} series={series} options={options} />
                    </CardContent>
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                    <CardHeader
                        title={`${formatTRY(profit?.monthTotal || 0)} TL`}
                        subheader='Bu Ay Toplam Kazanç'
                    />
                    <CardContent className='flex flex-col gap-6 !pbs-2.5'>
                        {summary.map((item, index) => (
                            <div key={index} className='flex items-center gap-3'>
                                <CustomAvatar skin='light' variant='rounded' color={item.avatarColor}>
                                    <i className={item.icon} />
                                </CustomAvatar>
                                <div className='flex flex-col gap-1'>
                                    <Typography className='font-medium' color='text.primary'>
                                        {item.title}
                                    </Typography>
                                    <Typography>{item.subtitle}</Typography>
                                </div>
                            </div>
                        ))}
                        <Button
                            fullWidth
                            variant='contained'
                            color='primary'
                            component={Link}
                            href={`/${locale}/apps/order/list`}
                        >
                            Detaylı İstatistikleri Gör
                        </Button>
                    </CardContent>
                </Grid>
            </Grid>
        </Card>
    )
}

export default TotalProfitStackedBar
