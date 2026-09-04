'use client'

// MUI Imports
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'

// Type Imports
import type { Funnel } from './types'

// Util Imports
import { formatNumber, formatPercent, toNumber } from './format'

// Component Imports
import EmptyState from './EmptyState'

type FunnelStepsProps = {
    funnel?: Funnel | null
}

// Dönüşüm dökümü: 4 adım, yüzde + adet + ince ilerleme çubuğu
const FunnelSteps = ({ funnel }: FunnelStepsProps) => {
    const sessions = toNumber(funnel?.sessions)

    const steps = [
        { label: 'Oturumlar', count: sessions, pct: sessions > 0 ? 100 : 0, icon: 'ri-group-line' },
        {
            label: 'Sepete ekledi',
            count: toNumber(funnel?.addedToCart),
            pct: toNumber(funnel?.addedToCartPct),
            icon: 'ri-shopping-cart-line'
        },
        {
            label: 'Ödeme sayfası',
            count: toNumber(funnel?.reachedCheckout),
            pct: toNumber(funnel?.reachedCheckoutPct),
            icon: 'ri-bank-card-line'
        },
        { label: 'Sipariş verdi', count: toNumber(funnel?.ordered), pct: toNumber(funnel?.orderedPct), icon: 'ri-check-double-line' }
    ]

    if (sessions <= 0) return <EmptyState />

    return (
        <div className='flex flex-col gap-5'>
            {steps.map(step => (
                <div key={step.label} className='flex flex-col gap-2'>
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex items-center gap-2'>
                            <i className={`${step.icon} text-xl text-textSecondary`} />
                            <Typography color='text.primary'>{step.label}</Typography>
                        </div>
                        <div className='flex items-center gap-3'>
                            <Typography color='text.secondary' variant='body2'>
                                {formatNumber(step.count)}
                            </Typography>
                            <Typography color='text.primary' className='font-medium min-is-[3.5rem] text-end'>
                                {formatPercent(step.pct)}
                            </Typography>
                        </div>
                    </div>
                    <LinearProgress
                        variant='determinate'
                        color='primary'
                        value={Math.min(100, Math.max(0, step.pct))}
                        sx={{ height: 6, borderRadius: 3 }}
                    />
                </div>
            ))}
        </div>
    )
}

export default FunnelSteps
