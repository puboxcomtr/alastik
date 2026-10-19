'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'

import { formatInt } from './format'
import type { OverviewData } from './format'

const opacityForRank = (rank: number, count: number) => 1 - (rank / Math.max(count, 1)) * 0.65

const RimSplitCard = ({ split, window }: { split: OverviewData['rimSplit']; window: string }) => {
    const items = split.items.slice(0, 8)
    const hasData = items.length > 0 && split.totalUnits > 0

    return (
        <Card className='bs-full'>
            <CardHeader title='Ebat Bazlı Satış' subheader={`Jant çapına (inç) göre satış adedi payı · son ${window === '12ay' ? '12 ay' : window}`} />
            <CardContent className='flex flex-col gap-5'>
                {hasData ? (
                    <>
                        <div className='flex flex-wrap gap-x-8 gap-y-3'>
                            {items.map((item, index) => (
                                <div key={item.inch} className='flex flex-col'>
                                    <div className='flex items-center gap-1'>
                                        <i className='ri-focus-3-line text-base' style={{ color: 'var(--mui-palette-primary-main)', opacity: opacityForRank(index, items.length) }} />
                                        <Typography className='font-medium' color='text.primary'>{`%${item.share}`}</Typography>
                                    </div>
                                    <Typography color='text.primary'>{`${item.inch} inç`}</Typography>
                                    <Typography variant='body2' color='text.secondary'>{`${formatInt(item.units)} adet`}</Typography>
                                </div>
                            ))}
                        </div>
                        <div className='flex is-full overflow-hidden rounded' style={{ height: 28, gap: 2 }}>
                            {items.map((item, index) => (
                                <Tooltip key={item.inch} title={`${item.inch} inç — ${formatInt(item.units)} adet (%${item.share})`}>
                                    <div
                                        style={{
                                            flex: `${Math.max(item.share, 2)} 0 0`,
                                            background: 'var(--mui-palette-primary-main)',
                                            opacity: opacityForRank(index, items.length),
                                            borderRadius: 4
                                        }}
                                    />
                                </Tooltip>
                            ))}
                        </div>
                    </>
                ) : (
                    <Typography color='text.secondary'>Bu dönemde satış verisi yok.</Typography>
                )}
            </CardContent>
        </Card>
    )
}

export default RimSplitCard
