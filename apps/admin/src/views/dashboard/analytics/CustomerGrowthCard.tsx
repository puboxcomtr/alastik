'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'

import { formatInt } from './format'
import type { OverviewData } from './format'

// Bu ay kayıt olan yeni üyeler
const CustomerGrowthCard = ({ growth }: { growth: OverviewData['customerGrowth'] }) => {
    const total = growth.thisMonth + growth.lastMonth
    const progress = total ? Math.round((growth.thisMonth / total) * 100) : 0
    const negative = growth.trend < 0

    return (
        <Card className='bs-full'>
            <CardHeader
                title='Müşteri Artışı'
                subheader='Bu ay yeni kayıtlı müşteri'
                action={
                    <Chip
                        size='small'
                        variant='tonal'
                        color={negative ? 'error' : 'success'}
                        label={`${negative ? '' : '+'}%${growth.trend.toLocaleString('tr-TR')} geçen aya göre`}
                    />
                }
            />
            <CardContent className='flex flex-col gap-4'>
                <div className='flex items-center gap-3'>
                    <CustomAvatar color='primary' skin='light' variant='rounded' size={42}>
                        <i className='ri-user-add-line' />
                    </CustomAvatar>
                    <Typography variant='h3' color='text.primary'>
                        +{formatInt(growth.thisMonth)}
                    </Typography>
                </div>
                <LinearProgress variant='determinate' value={progress} sx={{ height: 6, borderRadius: 3 }} />
                <div className='flex items-center justify-between'>
                    <Typography variant='body2' color='text.secondary'>
                        Geçen ay: {formatInt(growth.lastMonth)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        <i className='ri-group-line' /> Toplam:{' '}
                        <Typography component='span' className='font-medium' color='text.primary'>
                            {formatInt(growth.total)}
                        </Typography>
                    </Typography>
                </div>
            </CardContent>
        </Card>
    )
}

export default CustomerGrowthCard
