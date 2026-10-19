'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

import CustomAvatar from '@core/components/mui/Avatar'

import { formatInt } from './format'
import type { OverviewData } from './format'

const OrderActivityCard = ({ activity }: { activity: OverviewData['orderActivity'] }) => {
    const tiles = [
        { label: 'Onay Bekleyen', value: activity.awaitingApproval, icon: 'ri-time-line', color: 'warning' as const },
        { label: 'Hazırlanan', value: activity.preparing, icon: 'ri-box-3-line', color: 'info' as const },
        { label: 'Kargoda', value: activity.shipped, icon: 'ri-truck-line', color: 'primary' as const },
        { label: 'Tamamlanan', value: activity.completed, icon: 'ri-checkbox-circle-line', color: 'success' as const }
    ]

    return (
        <Card className='bs-full'>
            <CardHeader title='Sipariş Aktivitesi' subheader='Ödemesi alınmış siparişler' />
            <CardContent>
                <Grid container spacing={4}>
                    {tiles.map(tile => (
                        <Grid key={tile.label} size={{ xs: 6 }}>
                            <div className='flex items-center gap-3 rounded border p-3' style={{ borderColor: 'var(--mui-palette-divider)' }}>
                                <CustomAvatar color={tile.color} skin='light' variant='rounded' size={38}>
                                    <i className={tile.icon} />
                                </CustomAvatar>
                                <div className='flex flex-col'>
                                    <Typography variant='h5' color='text.primary'>
                                        {formatInt(tile.value)}
                                    </Typography>
                                    <Typography variant='body2'>{tile.label}</Typography>
                                </div>
                            </div>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    )
}

export default OrderActivityCard
