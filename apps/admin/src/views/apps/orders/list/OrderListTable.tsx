'use client'

// React Imports
import { useState, useEffect, useMemo } from 'react'

/* Sipariş ve Ödeme Durumları */
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/orderStatus'
import { PAYMENT_STATUS_LABELS } from '@/constants/paymentStatus'

/* Types Import */
import type { OrderTableRow } from '@/types/apps/orderTypes'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

// Third-party Imports
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import type { Locale } from '@configs/i18n'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}
const columnHelper = createColumnHelper<OrderTableRow>()


const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}



const OrderListTable = ({ orderData }: { orderData?: OrderTableRow[] }) => {
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<OrderTableRow[]>(orderData || [])
  const [globalFilter, setGlobalFilter] = useState('')

  const { lang: locale } = useParams()

  const columns = useMemo<ColumnDef<OrderTableRow, any>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler()
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler()
            }}
          />
        )
      },
      columnHelper.accessor('order', {
        header: 'ID',
        cell: ({ row }) => (
          <Typography
            component={Link}
            href={getLocalizedUrl(`/apps/orders/edit/${row.original.order}`, locale as Locale)}
          >{`#${row.original.order}`}</Typography>
        )
      }),
      columnHelper.accessor('customer', {
        header: 'Adı Soyadı',
        cell: ({ row }) => (
          <Tooltip
            title={
              <div>
                <div>Email: {row.original.email || 'Yok'}</div>
                <div>Telefon: {row.original.phone || 'Yok'}</div>
              </div>
            }
            arrow
          >
            <div className='flex items-center gap-3'>
              <div className='flex flex-col'>
                <Typography color='text.primary' className='font-medium'>
                  {row.original.customer}
                </Typography>
              </div>
            </div>
          </Tooltip>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Sipariş Durumu',
        cell: ({ row }) => (
          <Chip
            label={ORDER_STATUS_LABELS[row.original.status as keyof typeof ORDER_STATUS_LABELS] || row.original.status}
            color={ORDER_STATUS_COLORS[row.original.status as keyof typeof ORDER_STATUS_COLORS] || 'warning'}
            variant='tonal'
            size='small'
          />
        )
      }),
      columnHelper.accessor('payment', {
        header: 'Ödeme Türü',
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            <Typography>
              {PAYMENT_STATUS_LABELS[row.original.payment] || 'Beklemede'}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('date', {
        header: 'Sipariş Tarihi',
        cell: ({ row }) => {
          const date = new Date(row.original.date);
          const formattedDate = date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          return (
            <Typography>
              {`${formattedDate}`}
            </Typography>
          );
        }
      }),
      columnHelper.accessor('total', {
        header: 'Toplam Tutar',
        cell: ({ row }) => (
          <Typography variant='body2' className='font-medium'>
            {new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: row.original.currency || 'TRY'
            }).format(row.original.total || 0)}
          </Typography>
        )
      }),
      columnHelper.accessor('actions', {
        id: 'actions',
        header: 'İşlemler',
        cell: ({ row }) => (
          <Tooltip title="Sipariş Detayını Görüntüle">
            <Link
              className='flex items-center gap-2'
              href={getLocalizedUrl(`/apps/orders/edit/${row.original.order}`, locale as Locale)}
            >
              <IconButton size='small'>
                <i className="ri-eye-line"></i>
              </IconButton>
              Görüntüle
            </Link>
          </Tooltip>
        ),
        enableSorting: false
      })
    ],
    [data, locale]
  )

  const table = useReactTable({
    data: data as OrderType[],
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      rowSelection,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: true,
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })


  return (
    <Card>
      <CardContent className='flex justify-between max-sm:flex-col sm:items-center gap-4'>
        <DebouncedInput
          value={globalFilter ?? ''}
          onChange={value => setGlobalFilter(String(value))}
          placeholder='Sipariş Adı Soyadı'
          className='sm:is-auto'
        />
        <Button variant='outlined' color='secondary' startIcon={<i className='ri-upload-2-line' />}>
          Export
        </Button>
      </CardContent>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={classnames({
                          'flex items-center': header.column.getIsSorted(),
                          'cursor-pointer select-none': header.column.getCanSort()
                        })}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <i className='ri-arrow-up-s-line text-xl' />,
                          desc: <i className='ri-arrow-down-s-line text-xl' />
                        }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {table.getFilteredRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  No data available
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table
                .getRowModel()
                .rows.slice(0, table.getState().pagination.pageSize)
                .map(row => {
                  return (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  )
                })}
            </tbody>
          )}
        </table>
      </div>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component='div'
        className='border-bs'
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => {
          table.setPageIndex(page)
        }}
        onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
      />
    </Card>
  )
}

export default OrderListTable