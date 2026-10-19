'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import tableStyles from '@core/styles/table.module.css'

import type { LiveRecentSale } from './types'
import { formatTRY } from './types'

const formatSaleDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '-'

    return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const RecentSalesCard = ({ sales }: { sales?: LiveRecentSale[] | null }) => {
    const rows = Array.isArray(sales) ? sales.filter(sale => sale && sale.orderNumber) : []

    return (
        <Card>
            <CardHeader title='Son Satışlar' subheader='Bugün oluşturulan son siparişler' />
            <CardContent className='!pbe-1'>
                {rows.length === 0 ? (
                    <Typography color='text.secondary' className='pbe-4'>
                        Bugün henüz satış yok.
                    </Typography>
                ) : (
                    <table className={tableStyles.table}>
                        <tbody>
                            {rows.map((sale, index) => (
                                <tr key={`${sale.orderNumber}-${index}`}>
                                    <td className='flex items-center gap-2 !plb-2.5 !pis-0 !bs-[unset]'>
                                        <i className='ri-shopping-bag-3-line text-base text-textSecondary' />
                                        <Typography color='text.primary' className='font-medium'>
                                            #{sale.orderNumber}
                                        </Typography>
                                    </td>
                                    <td className='text-end !plb-2.5 !bs-[unset]'>
                                        <Typography variant='body2' color='text.secondary'>
                                            {formatSaleDate(sale.createdAt)}
                                        </Typography>
                                    </td>
                                    <td className='text-end !plb-2.5 !pie-0 !bs-[unset]'>
                                        <Typography color='text.primary' className='font-medium'>
                                            {formatTRY(Number(sale.total))} TL
                                        </Typography>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </CardContent>
        </Card>
    )
}

export default RecentSalesCard
