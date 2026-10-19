'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import type { ThemeColor } from '@core/types'
import type { LiveBehavior } from './types'
import { formatCount } from './types'

type BehaviorItem = {
    key: keyof LiveBehavior
    title: string
    icon: string
    color: ThemeColor
}

const BEHAVIOR_ITEMS: BehaviorItem[] = [
    { key: 'addedToCart', title: 'Sepete ekledi', icon: 'ri-shopping-cart-2-line', color: 'primary' },
    { key: 'reachedCheckout', title: 'Ödeme sayfasında', icon: 'ri-bank-card-line', color: 'info' },
    { key: 'ordered', title: 'Sipariş verdi', icon: 'ri-checkbox-circle-line', color: 'success' }
]

const CustomerBehaviorCard = ({ behavior }: { behavior?: Partial<LiveBehavior> | null }) => {
    return (
        <Card>
            <CardHeader title='Müşteri Davranışı' subheader='Son 15 dakika' />
            <CardContent>
                <Grid container spacing={4}>
                    {BEHAVIOR_ITEMS.map(item => (
                        <Grid key={item.key} size={{ xs: 4 }}>
                            <div className='flex flex-col items-center text-center gap-2'>
                                <CustomAvatar color={item.color} skin='light' size={42}>
                                    <i className={item.icon} />
                                </CustomAvatar>
                                <Typography variant='h5'>{formatCount(Number(behavior?.[item.key] ?? 0))}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    {item.title}
                                </Typography>
                            </div>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    )
}

export default CustomerBehaviorCard
