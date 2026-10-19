'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import tableStyles from '@core/styles/table.module.css'

import type { TopProduct } from './types'

import { formatNumber, formatTRY, toNumber } from './format'

import EmptyState from './EmptyState'

type TopProductsTableProps = {
    products?: TopProduct[] | null
}

const StockCell = ({ product }: { product: TopProduct }) => {
    if (product.stockStatus === 'out') return <Chip size='small' variant='tonal' color='error' label='Tükendi' />
    if (product.stockStatus === 'low') return <Chip size='small' variant='tonal' color='warning' label='Az kaldı' />

    if (product.stock === null || product.stock === undefined || product.stockStatus === 'unknown') {
        return (
            <Typography color='text.secondary' variant='body2'>
                —
            </Typography>
        )
    }

    return <Typography color='text.primary'>{formatNumber(toNumber(product.stock))}</Typography>
}

const TopProductsTable = ({ products }: TopProductsTableProps) => {
    const rows = products ?? []

    return (
        <Card>
            <CardHeader title='En Çok Satılan Ürünler' subheader='Seçili dönemde satılan adete göre' />
            {rows.length === 0 ? (
                <EmptyState minHeight={160} />
            ) : (
                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Ürün</th>
                                <th align='right'>Adet</th>
                                <th align='right'>Sipariş</th>
                                <th align='right'>Tutar</th>
                                <th align='right'>Kalan Stok</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((product, index) => (
                                <tr key={product.productKey || `${product.stockCode}-${index}`}>
                                    <td>
                                        <Typography color='text.secondary'>{index + 1}</Typography>
                                    </td>
                                    <td>
                                        <div className='flex flex-col'>
                                            <Typography color='text.primary' className='font-medium'>
                                                {product.name || 'İsimsiz ürün'}
                                            </Typography>
                                            {product.stockCode ? (
                                                <Typography variant='body2' color='text.secondary'>
                                                    {product.stockCode}
                                                </Typography>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td align='right'>
                                        <Typography color='text.primary'>{formatNumber(toNumber(product.units))}</Typography>
                                    </td>
                                    <td align='right'>
                                        <Typography color='text.primary'>{formatNumber(toNumber(product.orders))}</Typography>
                                    </td>
                                    <td align='right'>
                                        <Typography color='text.primary' className='font-medium'>
                                            {formatTRY(toNumber(product.revenue))}
                                        </Typography>
                                    </td>
                                    <td align='right'>
                                        <div className='flex justify-end'>
                                            <StockCell product={product} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    )
}

export default TopProductsTable
