'use client'

// React Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'

// Third-party Imports
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

export type RecentOrder = {
    id: string
    orderNumber: string
    issuedDate: string
    name: string
    contact: string
    total: number
    paymentMethod: string
}

const columnHelper = createColumnHelper<RecentOrder>()

const formatTRY = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })

// Seçili sitenin son siparişleri
const Table = ({ orders = [] }: { orders?: RecentOrder[] }) => {
    const { lang: locale } = useParams()

    const columns: ColumnDef<RecentOrder, any>[] = [
        columnHelper.accessor('issuedDate', {
            header: 'Sipariş Tarihi',
            cell: ({ row }) => (
                <div className='flex flex-col'>
                    <Typography className='text-sm text-gray-400' color='text.primary'>
                        {formatDate(row.original.issuedDate)}
                    </Typography>
                    <Typography variant='body2'>{row.original.orderNumber}</Typography>
                </div>
            )
        }),
        columnHelper.accessor('name', {
            header: 'Müşteri Bilgileri',
            cell: ({ row }) => (
                <div className='flex items-center gap-3'>
                    <div className='flex flex-col'>
                        <Typography className='font-medium' color='text.primary'>
                            {row.original.name}
                        </Typography>
                        <Typography variant='body2'>{row.original.contact}</Typography>
                    </div>
                </div>
            )
        }),
        columnHelper.accessor('total', {
            header: 'Tutar',
            cell: ({ row }) => <Typography>{`${formatTRY(row.original.total)} TL`}</Typography>
        }),
        columnHelper.accessor('paymentMethod', {
            header: 'Ödeme Türü',
            cell: ({ row }) => <Typography color='text.primary'>{row.original.paymentMethod}</Typography>
        }),
        {
            id: 'actions',
            header: 'İşlemler',
            cell: ({ row }) => (
                <Link href={`/${locale}/apps/order/detail/${row.original.id}`}>
                    <Tooltip title='Siparişi Görüntüle'>
                        <CustomAvatar skin='light' size={18}>
                            <i className='ri-eye-fill' />
                        </CustomAvatar>
                    </Tooltip>
                </Link>
            )
        }
    ]

    const table = useReactTable({
        data: orders,
        columns,
        getCoreRowModel: getCoreRowModel()
    })

    return (
        <Card>
            <CardHeader title='Son Siparişler' />
            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    {orders.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan={columns.length} className='text-center'>
                                    Henüz sipariş bulunmuyor
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>
        </Card>
    )
}

export default Table
