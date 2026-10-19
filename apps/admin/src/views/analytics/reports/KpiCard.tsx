'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import type { ThemeColor } from '@core/types'

import { formatDecimal, toNumber } from './format'

type KpiCardProps = {
    title: string
    value: string
    icon: string
    color: ThemeColor
    trend?: number | null
    subtitle?: string
}

const KpiCard = ({ title, value, icon, color, trend, subtitle }: KpiCardProps) => {
    const hasTrend = typeof trend === 'number' && Number.isFinite(trend)
    const trendValue = toNumber(trend)
    const trendColor = trendValue < 0 ? 'error.main' : trendValue > 0 ? 'success.main' : 'text.secondary'
    const trendIcon = trendValue < 0 ? 'ri-arrow-down-s-line' : trendValue > 0 ? 'ri-arrow-up-s-line' : 'ri-subtract-line'

    return (
        <Card className='bs-full'>
            <CardContent>
                <div className='flex justify-between items-center is-full mbe-5'>
                    <CustomAvatar color={color} skin='light' size={42} className='shadow-xs'>
                        <i className={icon} />
                    </CustomAvatar>
                </div>
                <div className='flex flex-col gap-1'>
                    <Typography color='text.secondary'>{title}</Typography>
                    <div className='flex gap-x-2 gap-y-0.5 items-center flex-wrap'>
                        <Typography variant='h5'>{value}</Typography>
                        {hasTrend ? (
                            <Typography color={trendColor} className='flex items-center'>
                                <i className={`${trendIcon} text-xl`} />
                                {`%${formatDecimal(Math.abs(trendValue), 1)}`}
                            </Typography>
                        ) : null}
                    </div>
                    {subtitle ? (
                        <Typography variant='body2' color='text.secondary'>
                            {subtitle}
                        </Typography>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    )
}

export default KpiCard
