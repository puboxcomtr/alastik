'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { useTheme } from '@mui/material/styles'

// Components Imports
import OptionsMenu from '@core/components/option-menu'
import CustomAvatar from '@core/components/mui/Avatar'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const data = [
    {
        title: '22 Adet',
        avatarColor: 'secondary',
        subtitle: 'Onaylanan Sipariş',
        icon: 'ri-pie-chart-2-line'
    },
    {
        title: '3 Adet.',
        avatarColor: 'secondary',
        subtitle: 'İptal Edilen Sipariş',
        icon: 'ri-money-dollar-circle-line'
    },
    {
        title: '22.850,45 TL',
        avatarColor: 'secondary',
        subtitle: 'Günlük Kazanç',
        icon: 'ri-bank-card-line'
    }
]

const series = [
    {
        name: 'Günlük Kazanç',
        data: [29000, 22000, 25000, 18500, 29000, 20000, 29000, 22000, 25000, 18500, 29000, 20000, 12000, 3500]
    }
]

const TotalProfitStackedBar = () => {
    const theme = useTheme()
    const disabledText = 'var(--mui-palette-text-disabled)'

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
            categories: ["Pzt", "Sal", "Çrş", "Prş", "Cum", "Cts", "Pzr", "Pzt", "Sal", "Çrş", "Prş", "Cum", "Cts", "Pzr"],
            labels: {
                style: { colors: disabledText, fontSize: theme.typography.body2.fontSize }
            }
        },
        yaxis: {
            labels: {
                offsetY: 2,
                offsetX: -15,
                formatter: (value) => (value > 999 ? `${(value / 1000).toFixed(0)}k` : `${value}`),
                style: { colors: disabledText, fontSize: theme.typography.body2.fontSize }
            }
        }
    }

    return (
        <Card>
            <Grid container>
                <Grid size={{ xs: 12, sm: 7 }} className='border-be sm:border-be-0 sm:border-ie'>
                    <CardHeader title='Siparişler' />
                    <CardContent sx={{ '& .apexcharts-xcrosshairs.apexcharts-active': { opacity: 0 } }}>
                        <AppReactApexCharts type='bar' width='100%' height={292} series={series} options={options} />
                    </CardContent>
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                    <CardHeader
                        title='99.587,47 TL'
                        subheader='Bu Ay Toplam Kazanç'
                        action={<OptionsMenu iconClassName='text-textPrimary' options={['Son 30 Gün', 'Geçen Ay', 'Geçen Yıl']} />}
                    />
                    <CardContent className='flex flex-col gap-6 !pbs-2.5'>
                        {data.map((item, index) => (
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
                        <Button fullWidth variant='contained' color='primary'>
                            Detaylı İstatistikleri Gör
                        </Button>
                    </CardContent>
                </Grid>
            </Grid>
        </Card>
    )
}

export default TotalProfitStackedBar