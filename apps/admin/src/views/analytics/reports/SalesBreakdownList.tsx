'use client'

// MUI Imports
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'

// Type Imports
import type { SalesBreakdown } from './types'

// Util Imports
import { formatTRY, toNumber } from './format'

type SalesBreakdownListProps = {
    breakdown?: SalesBreakdown | null
}

// Toplam satış dökümü: etiket + TL tutarı listesi
const SalesBreakdownList = ({ breakdown }: SalesBreakdownListProps) => {
    const rows: { label: string; value: number; emphasis?: boolean }[] = [
        { label: 'Brüt satışlar', value: toNumber(breakdown?.gross) },
        { label: 'İadeler', value: toNumber(breakdown?.refunds) },
        { label: 'Net satışlar', value: toNumber(breakdown?.net) },
        { label: 'Alınan kargo ücreti', value: toNumber(breakdown?.shippingCollected) },
        { label: 'Tahsil edilen', value: toNumber(breakdown?.collected), emphasis: true },
        { label: 'Ortalama sipariş değeri', value: toNumber(breakdown?.avgOrderValue) }
    ]

    return (
        <div className='flex flex-col'>
            {rows.map((row, index) => (
                <div key={row.label}>
                    {index > 0 ? <Divider /> : null}
                    <div className='flex items-center justify-between gap-4 plb-3'>
                        <Typography color={row.emphasis ? 'text.primary' : 'text.secondary'} className={row.emphasis ? 'font-medium' : ''}>
                            {row.label}
                        </Typography>
                        <Typography color='text.primary' className='font-medium'>
                            {formatTRY(row.value)}
                        </Typography>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default SalesBreakdownList
