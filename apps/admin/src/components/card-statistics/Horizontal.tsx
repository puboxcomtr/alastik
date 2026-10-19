'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import type { CardStatsHorizontalProps } from '@/types/pages/widgetTypes'

import CustomAvatar from '@core/components/mui/Avatar'

import { useSettings } from '@core/hooks/useSettings'

const CardStatHorizontal = (props: CardStatsHorizontalProps) => {
  const { title, stats, icon, color, trendNumber, trend } = props

  const { settings } = useSettings()

  return (
    <Card className='bg-transparent border rounded shadow-none'>
      <CardContent className='flex items-center gap-4'>
        <CustomAvatar
          variant='rounded'
          skin='light'
          color={color}
          className={classnames('bg-backgroundPaper', {
            'shadow-none border rounded': settings.skin === 'bordered',
            'shadow-xs': settings.skin === 'default'
          })}
        >
          <i className={icon} />
        </CustomAvatar>
        <div>
          <Typography>{title}</Typography>
          <div className='flex items-center'>
            <Typography variant='h5'>{stats}</Typography>
            <div className='flex items-center'>
              <i
                className={classnames(
                  trend === 'up' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line',
                  trend === 'up' ? 'text-success' : 'text-error'
                )}
              ></i>
              <Typography color={trend === 'up' ? 'success.main' : 'error.main'}>{trendNumber}</Typography>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CardStatHorizontal
