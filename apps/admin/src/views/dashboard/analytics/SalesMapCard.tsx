'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Grid from '@mui/material/Grid2'

import TurkeyMap from '@/views/analytics/shared/TurkeyMap'

import { formatTRY } from './format'
import type { OverviewData } from './format'

const SalesMapCard = ({ salesMap, window }: { salesMap: OverviewData['salesMap']; window: string }) => {
    const rows = salesMap.slice(0, 8)
    const max = rows.length ? Math.max(...rows.map(r => r.total)) : 0

    return (
        <Card className='bs-full'>
            <CardHeader
                title='Satış Haritası'
                subheader={`Tahsil edilen ciroya göre · son ${window === '12ay' ? '12 ay' : window}`}
            />
            <CardContent>
                {rows.length === 0 ? (
                    <Typography color='text.secondary'>Bu dönemde satış verisi yok.</Typography>
                ) : (
                    <Grid container spacing={6} alignItems='center'>
                        <Grid size={{ xs: 12, md: 7 }}>
                            <TurkeyMap
                                points={salesMap.map(r => ({ city: r.city, value: r.total }))}
                                valueLabel={(v: number) => `${formatTRY(v)} TL`}
                                height={300}
                                color='primary'
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <div className='flex flex-col gap-4'>
                                {rows.map(row => (
                                    <div key={row.city} className='flex flex-col gap-1'>
                                        <div className='flex items-center justify-between gap-2'>
                                            <div className='flex items-center gap-1'>
                                                <i className='ri-map-pin-2-line text-base' style={{ color: 'var(--mui-palette-primary-main)' }} />
                                                <Typography color='text.primary'>{row.city}</Typography>
                                            </div>
                                            <Typography className='font-medium' color='text.primary'>{`${formatTRY(row.total)} TL`}</Typography>
                                        </div>
                                        <LinearProgress
                                            variant='determinate'
                                            value={max ? Math.round((row.total / max) * 100) : 0}
                                            sx={{ height: 5, borderRadius: 3 }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Grid>
                    </Grid>
                )}
            </CardContent>
        </Card>
    )
}

export default SalesMapCard
