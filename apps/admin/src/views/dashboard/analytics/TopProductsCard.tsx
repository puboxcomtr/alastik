'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import tableStyles from '@core/styles/table.module.css'

import { formatTRY, formatInt } from './format'
import type { OverviewData, TopProduct } from './format'

type RangeKey = keyof OverviewData['topProducts']

const RANGE_LABELS: Record<RangeKey, string> = { all: 'Tümü', month: 'Bu Ay', week: 'Bu Hafta' }

const StockCell = ({ product }: { product: TopProduct }) => {
    if (product.stockStatus === 'out') return <Chip size='small' variant='tonal' color='error' label='Tükendi' />
    if (product.stockStatus === 'low') return <Chip size='small' variant='tonal' color='warning' label={`Az kaldı (${formatInt(product.stock || 0)})`} />
    if (product.stockStatus === 'unknown' || product.stock === null) return <Typography color='text.secondary'>-</Typography>

    return <Typography color='text.primary'>{formatInt(product.stock)}</Typography>
}

const TopProductsCard = ({ products }: { products: OverviewData['topProducts'] }) => {
    const [range, setRange] = useState<RangeKey>('all')
    const rows = products[range] || []

    return (
        <Card>
            <CardHeader
                title='En Çok Satan Ürünler'
                action={
                    <ToggleButtonGroup
                        exclusive
                        size='small'
                        value={range}
                        onChange={(_, value: RangeKey | null) => value && setRange(value)}
                    >
                        {(Object.keys(RANGE_LABELS) as RangeKey[]).map(key => (
                            <ToggleButton key={key} value={key}>
                                {RANGE_LABELS[key]}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                }
            />
            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        <tr>
                            <th>Ürün</th>
                            <th className='text-end'>Satış</th>
                            <th className='text-end'>Ciro</th>
                            <th className='text-end'>Stok</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className='text-center'>Bu dönemde satış yok</td>
                            </tr>
                        ) : (
                            rows.map(product => (
                                <tr key={`${range}-${product.productKey || product.name}`}>
                                    <td>
                                        <div className='flex flex-col'>
                                            <Typography className='font-medium' color='text.primary'>
                                                {product.name}
                                            </Typography>
                                            <Typography variant='body2'>{product.stockCode}</Typography>
                                        </div>
                                    </td>
                                    <td className='text-end'>
                                        <Typography className='font-medium' color='text.primary'>{`${formatInt(product.units)} adet`}</Typography>
                                    </td>
                                    <td className='text-end'>
                                        <Typography>{`${formatTRY(product.revenue)} TL`}</Typography>
                                    </td>
                                    <td className='text-end'>
                                        <StockCell product={product} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

export default TopProductsCard
