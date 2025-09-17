'use client'

// React Imports
import { useState } from 'react'

import Link from 'next/link'
// MUI Imports
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'

// Hooks
import classnames from 'classnames'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { InvoiceType } from '@/types/apps/invoiceTypes'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type InvoiceStatusObj = {
  [key: string]: {
    icon: string
    color: ThemeColor
  }
}

// Column Definitions
const columnHelper = createColumnHelper<InvoiceType>()

// Vars
const invoiceStatusObj: InvoiceStatusObj = {
  Paid: { color: 'secondary', icon: 'ri-send-plane-2-line' },
  Pending: { color: 'success', icon: 'ri-check-line' },
  Havale: { color: 'primary', icon: 'ri-mail-line' },
  'Partial Payment': { color: 'warning', icon: 'ri-pie-chart-2-line' },
  'Past Due': { color: 'error', icon: 'ri-information-line' },
  Downloaded: { color: 'info', icon: 'ri-arrow-down-line' }
}

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
    cell: ({ row }) => <Tooltip
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

  }),
  columnHelper.accessor('balance', {
    header: 'Ödeme Türü',
    cell: ({ row }) => {
      return <Typography color='text.primary'>{row.original.invoiceStatus}</Typography>
    }
  }),
  columnHelper.accessor('actions', {
    header: 'İşlemler',
    cell: ({ row }) =>
      <>

        <div className="flex gap-6">
          <Link href="">
            <Tooltip title={"Siparişi Görüntüle"}>
              <CustomAvatar skin='light' size={18}>
                <i className="ri-eye-fill" />
              </CustomAvatar>
            </Tooltip>
          </Link>
          <Link href="">
          <Tooltip title={"Siparişi Yazdır"}>
            <CustomAvatar skin='light' size={18}>
              <i className="ri-printer-fill" />
            </CustomAvatar>
          </Tooltip>
          </Link>
        </div>
      </>


  })
]



const DashboardTables = ({ invoiceData }: { invoiceData: InvoiceType[] }) => {
  // States
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [data, setData] = useState([...invoiceData])

  // Hooks
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: {
      fuzzy: () => false
    }
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

export default DashboardTables
