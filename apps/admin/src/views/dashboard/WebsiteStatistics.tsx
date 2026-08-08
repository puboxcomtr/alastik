'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'

// Styles Imports
import tableStyles from '@core/styles/table.module.css'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

export type VisitStats = {
    total: number
    daily: number[]
    devices: { title: string; color: string; count: number; share: number }[]
}

// Seçili sitenin son 28 gün ziyaret istatistikleri (oturum kayıtlarından)
const WebsiteStatistics = ({ visits }: { visits?: VisitStats }) => {
    const options = {
        chart: {
            parentHeightOffset: 0,
            type: 'bar',
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                columnWidth: '35%',
                horizontal: false,
                borderRadius: 2,
                distributed: true
            }
        },
        colors: ['var(--mui-palette-primary-main)'],
        grid: {
            padding: { top: -33, right: 5, bottom: -13, left: -12 },
            show: false
        },
        dataLabels: { enabled: false },
        tooltip: { enabled: false },
        legend: { show: false },
        xaxis: {
            labels: { show: false },
            axisTicks: { show: false },
            axisBorder: { show: false }
        },
        yaxis: {
            labels: { show: false }
        }
    }

    const dailyData = visits?.daily?.length ? visits.daily : [0]

    return (
        <Card className='bs-full'>
            <CardHeader title='Website Ziyaretleri' subheader='Son 28 Gün' />
            <CardContent className='!pbe-1'>
                <div className='flex items-end justify-between pbe-5 pbs-5 xl:pbs-[0.6rem]'>
                    <div className='flex flex-col gap-2'>
                        <Typography variant='h1'>{(visits?.total || 0).toLocaleString('tr-TR')}</Typography>
                        <Typography variant='body2'>Toplam Ziyaret</Typography>
                    </div>
                    <AppReactApexCharts
                        type='bar'
                        height={85}
                        width={135}
                        options={options}
                        series={[{ data: dailyData }]}
                    />
                </div>
                <table className={tableStyles.table}>
                    <tbody>
                        {(visits?.devices || []).map((row, index) => (
                            <tr key={index}>
                                <td className='flex items-center gap-2 !plb-2.5 !pis-0 !bs-[unset]'>
                                    <i className={classnames('ri-circle-fill text-base', `text-${row.color}`)} />
                                    <Typography color='text.primary'>{row.title}</Typography>
                                </td>
                                <td className='text-end !plb-2.5 !bs-[unset]'>
                                    <Typography color='text.primary' className='font-medium'>
                                        {row.count.toLocaleString('tr-TR')}
                                    </Typography>
                                </td>
                                <td className='text-end !plb-2.5 !pie-0 !bs-[unset]'>
                                    <Typography color='text.primary' className='font-medium'>
                                        {`%${row.share}`}
                                    </Typography>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}

export default WebsiteStatistics
