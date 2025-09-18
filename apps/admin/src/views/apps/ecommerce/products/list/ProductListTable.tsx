'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import classnames from 'classnames'
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


// Component Imports
import TableFilters from './TableFilters'

// Style Imports
import tableStyles from '@core/styles/table.module.css'


const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({
    itemRank
  })

  return itemRank.passed
}
const columnHelper = createColumnHelper<ProductType>()
const ProductListTable = ({ productData }: { productData?: ProductType[] }) => {
  // State Tanıtımı
  const [rowSelection, setRowSelection] = useState({})
  
  const [data, setData] = useState(() => productData || [])
  const [filteredData, setFilteredData] = useState(() => productData || [])

  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(false)

  // Hooks
  const { lang: locale } = useParams()
  const columns = useMemo<ColumnDef<ProductType, any>[]>(
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
      columnHelper.accessor('name', {
        header: 'Ürün Adı',
        cell: ({ row }) => (
          <div className='flex items-center' style={{ gap: '5px' }}>
            <img src={row.original.image} width={38} height={38} className='rounded bg-actionHover' />
            <div className='flex flex-col'>
              <Tooltip title="Ürün Ziyaret Et">
                <Link href={`/${locale}/apps/products/edit/${row.original.id}`}>
                  <Typography variant='body2' fontWeight='bold' >{row.original.sku}</Typography>
                  <Typography variant='body2'>
                    {row.original.name}
                  </Typography>
                </Link>
              </Tooltip>

            </div>
          </div>
        )
      }),
      columnHelper.accessor('category', {
        header: 'Kategori',
        cell: ({ row }) => {
          return (
            <div className='flex flex-col'>
              <Tooltip title="Kategoriyi Ziyaret Et">
                <Link href={`/${locale}/apps/products/edit/${row.original.id}`}>
                  <Typography fontWeight='bold' color='text.primary'>
                    {row.original.category}
                  </Typography>
                </Link>
              </Tooltip>

              <Tooltip title="Alt Kategoriyi Ziyaret Et">
                <Link href={`/${locale}/apps/products/edit/${row.original.id}`}>
                  <Typography variant='body2' color='text.secondary'>
                    {[
                      (row.original as any).m_kategoriler?.[0]?.kategori_aciklama_2,
                      (row.original as any).m_kategoriler?.[0]?.kategori_aciklama_3
                    ]
                      .filter(Boolean)
                      .join(' > ')}
                  </Typography>
                </Link>
              </Tooltip>
            </div>
          )
        }
      }),
      columnHelper.accessor('price', {
        header: 'Fiyat Alanı',
        cell: ({ row }) => {
          return (
            <div className='flex flex-col' style={{ gap: '5px' }}>
              <div className='flex' style={{ gap: '5px' }}>
                <Typography variant='body2' fontWeight={'bold'} color={'#eb3d63'}>Satış Fiyatı:</Typography>
                <Typography variant='body2'>{row.original.price.toLocaleString('tr-TR') + " TL"}</Typography>
              </div>
              <div className='flex' style={{ gap: '5px' }}>
                <Typography variant='body2' fontWeight={'bold'}>İndirimli Fiyatı:</Typography>
                <Typography variant='body2'>{row.original.price2.toLocaleString('tr-TR') + " TL"}</Typography>
              </div>
            </div>

          )
        }
      }),
      columnHelper.accessor('qty', {
        header: 'Stok Adeti',
        cell: ({ row }) => (
          <div className='flex flex-col' style={{ gap: '5px' }}>
            <div className='flex' style={{ gap: '5px' }}>
              <Typography variant='body2'>{row.original.qty.toLocaleString('tr-TR')} Adet</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('actions', {
        header: 'İşlemler',
        cell: ({ row }) => (
          <Tooltip title="Ürünü Düzenle">
            <Link href={`/${locale}/apps/products/edit/${row.original.id}`}>
              <IconButton size='small'>
                <i className="ri-edit-box-line"></i>
              </IconButton>
            </Link>
          </Tooltip>
        ),
        enableSorting: false
      })
    ],
    [data, filteredData]
  )

  const table = useReactTable({
    data: filteredData as ProductType[],
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
    <>
      <Card>
        <CardHeader title='Ürün Filtreleme' className='pbe-4' />
        <TableFilters setData={setFilteredData} productData={data} setLoading={setLoading} />
        <Divider />
        <div style={{ position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              minHeight: '200px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CircularProgress size={24} />
                <Typography>Ürünler yükleniyor...</Typography>
              </div>
            </div>
          )}

          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : (
                          <>
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
                          </>
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
                      Ürün Bulunamadı
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
        </div>

        <TablePagination
          rowsPerPageOptions={[10, 100, 200]}
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
    </>
  )
}

export default ProductListTable