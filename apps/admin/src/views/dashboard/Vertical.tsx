'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Type Imports
import type { OptionType } from '@core/components/option-menu/types'
import type { ThemeColor } from '@core/types'

export type CardRange = 'today' | '7d' | '30d'

export const CARD_RANGE_LABELS: Record<CardRange, string> = {
    today: 'Bugün',
    '7d': 'Son 7 Gün',
    '30d': 'Son 30 Gün'
}

type Props = {
    title: string
    stats: string
    avatarIcon: string
    avatarColor: ThemeColor
    trendNumber?: string
    trend?: 'positive' | 'negative'
    // Dönem menüsü: seçim üst bileşene bildirilir; verilmezse menü gösterilmez (anlık sayılar için)
    activeRange?: CardRange
    onRangeChange?: (range: CardRange) => void
}

const CardStatVertical = ({ title, stats, avatarIcon, avatarColor, trendNumber, trend, activeRange, onRangeChange }: Props) => {
    const options: OptionType[] = (Object.keys(CARD_RANGE_LABELS) as CardRange[]).map(key => ({
        text: CARD_RANGE_LABELS[key],
        menuItemProps: {
            selected: key === activeRange,
            onClick: () => onRangeChange?.(key)
        }
    }))

    return (
        <Card className='bs-full'>
            <CardContent>
                <div className='flex justify-between items-center is-full mbe-5'>
                    <CustomAvatar color={avatarColor} skin='light' size={42} className='shadow-xs'>
                        <i className={avatarIcon} />
                    </CustomAvatar>
                    {onRangeChange ? (
                        <OptionMenu options={options} iconButtonProps={{ className: 'text-textPrimary' }} />
                    ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                    <Typography color='text.primary' className='text-md/6 text-gray-400'>
                        {title}
                    </Typography>
                    <div className='flex gap-x-2 gap-y-0.5 items-center flex-wrap'>
                        <Typography variant='h5'>{stats}</Typography>
                        {trendNumber ? (
                            <Typography color={trend === 'negative' ? 'error.main' : 'success.main'}>
                                {`${trend === 'negative' ? '-' : '+'}${trendNumber}`}
                            </Typography>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default CardStatVertical
