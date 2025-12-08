'use client'

// React Imports
import { useState } from 'react'
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'

// Third-party Imports
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Column Definitions
const columnHelper = createColumnHelper()

const mockData = [
    {
        id: 1,
        issuedDate: '22 Ekim 2025',
        name: 'Ahmet Yılmaz',
        contact: 'ahmet@example.com',
        total: '5.250',
        invoiceStatus: 'Havale'
    },
    {
        id: 2,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 3,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 4,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 5,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 6,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 7,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 8,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 5,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 6,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    },
    {
        id: 7,
        issuedDate: '21 Ekim 2025',
        name: 'Mehmet Demir',
        contact: 'mehmet@example.com',
        total: '3.120',
        invoiceStatus: 'Kredi Kartı'
    }
]

const columns = [
    columnHelper.accessor('invoiceStatus', {
        header: 'Sipariş Tarihi',
        cell: ({ row }) => (
            <Typography className='text-sm text-gray-400' color='text.primary'>
                {row.original.issuedDate}
            </Typography>
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
        cell: ({ row }) => (
            <Tooltip
                title={
                    <div>
                        <Typography variant='body2' component='span' className='text-inherit'>
                            KDV Hariç Tutar:
                        </Typography>{' '}
                        {row.original.total} TL
                        <br />
                        <Typography variant='body2' component='span' className='text-inherit'>
                            KDV Dahil Tutar
                        </Typography>{' '}
                        {row.original.total} TL
                    </div>
                }
            >
                <Typography>{row.original.total} TL</Typography>
            </Tooltip>
        )
    }),
    columnHelper.accessor('balance', {
        header: 'Ödeme Türü',
        cell: ({ row }) => {
            return <Typography color='text.primary'>{row.original.invoiceStatus}</Typography>
        }
    }),
    columnHelper.accessor('actions', {
        header: 'İşlemler',
        cell: () => (
            <div className='flex gap-6'>
                <Link href=''>
                    <Tooltip title={'Siparişi Görüntüle'}>
                        <CustomAvatar skin='light' size={18}>
                            <i className='ri-eye-fill' />
                        </CustomAvatar>
                    </Tooltip>
                </Link>
                <Link href=''>
                    <Tooltip title={'Siparişi Yazdır'}>
                        <CustomAvatar skin='light' size={18}>
                            <i className='ri-printer-fill' />
                        </CustomAvatar>
                    </Tooltip>
                </Link>
            </div>
        )
    })
]

const Table = () => {
    const [data] = useState(mockData)

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel()
    })

    return (
        <Card>
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
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

export default Table