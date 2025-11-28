'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BrandType } from '@/types/apps/brandTypes'

// MUI Imports
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import type { TextFieldProps } from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import { toast } from 'react-toastify'

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

// Component Imports
import EditbrandDrawer from './EditBrandDrawer'

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

export type brandWithActionsType = BrandType & {
  actions?: string
  showOnHomepage?: boolean
}

interface BrandListTableProps {
  brandData: any[]
  totalBrands: number
  meta: any
  error: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

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
  }, [value, onChange, debounce])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

const columnHelper = createColumnHelper<brandWithActionsType>()

const BrandListTable = ({ brandData, totalBrands, meta, error }: BrandListTableProps) => {
  const [selectedbrand, setSelectedbrand] = useState<any | null>(null)
  const [EditbrandOpen, setEditbrandOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<any[]>([])
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    if (brandData && brandData.length > 0) {
      const mappedData = brandData.map(brand => ({
        id: brand.id,
        name: brand.diaMarkaAck,
        description: brand.description || '',
        seoTitle: brand.seoTitle || brand.name || '',
        seoDescription: brand.seoDescription || '',
        seoUrl: brand.seoUrl || '',
        productCount: brand.productCount,
        webOrder: brand.webOrder,
        logo: brand.logo,
        status: brand.status,
        completenessScore: brand.completenessScore,
        totalStock: brand.totalStock,
        showOnHomepage: brand.showOnHomepage || false,
        priceRange: {
          averageFormatted: brand.priceRange?.averageFormatted || '₺0'
        }
      }))
      setData(mappedData)
    }
  }, [brandData])

  // Anasayfa gösterim durumunu güncelle
  const handleHomepageToggle = async (brandId: string, currentValue: boolean) => {
    try {
      const res = await fetch(`${API_URL}/brands/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ showOnHomepage: !currentValue })
      })

      const result = await res.json()

      if (result.success) {
        setData(prev =>
          prev.map(brand =>
            brand.id === brandId
              ? { ...brand, showOnHomepage: !currentValue }
              : brand
          )
        )
        toast.success(!currentValue ? 'Marka anasayfada gösterilecek' : 'Marka anasayfadan kaldırıldı')
      } else {
        toast.error('Güncelleme başarısız')
      }
    } catch (err) {
      console.error('Homepage toggle error:', err)
      toast.error('Bir hata oluştu')
    }
  }

  const columns = useMemo<ColumnDef<brandWithActionsType, any>[]>(
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
        header: 'Marka Adı',
        cell: ({ row }) => {
          const brand = row.original;
          const getImageUrl = (url: string | undefined | null) => {
            if (!url) return '/images/urun/gorsel-bulunamadi.jpg';
            if (url === '/images/urun/gorsel-bulunamadi.jpg') return url;
            if (url.startsWith('http')) return url;
            const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082';

            if (url.startsWith('/')) return `${MEDIA_URL}${url}`;
            return `${MEDIA_URL}/${url}`;
          };
          const logoSrc = getImageUrl(brand.logo);
          return (
            <div className='flex items-center gap-3'>
              <img
                src={logoSrc}
                width={38}
                height={38}
                className='rounded bg-actionHover object-contain'
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/urun/gorsel-bulunamadi.jpg';
                }}
              />
              <div className='flex flex-col items-start'>
                <Typography className='font-medium' color='text.primary'>
                  {brand.name}
                </Typography>
                {brand.description && (
                  <Typography variant='body2' className='line-clamp-1 max-w-[200px]'>
                    {brand.description}
                  </Typography>
                )}
              </div>
            </div>
          );
        }
      }),
      columnHelper.accessor('productCount', {
        header: 'Ürün Sayısı',
        cell: ({ row }) => <Typography>{row.original.productCount.toLocaleString()}</Typography>
      }),
      columnHelper.accessor('webOrder', {
        header: 'Öncelik',
        cell: ({ row }) => <Typography>{row.original.webOrder}</Typography>
      }),
      columnHelper.accessor('showOnHomepage', {
        header: 'Anasayfa',
        cell: ({ row }) => (
          <Tooltip title={row.original.showOnHomepage ? 'Anasayfadan Kaldır' : 'Anasayfada Göster'}>
            <Switch
              checked={row.original.showOnHomepage || false}
              onChange={() => handleHomepageToggle(row.original.id, row.original.showOnHomepage || false)}
              size='small'
              color='success'
            />
          </Tooltip>
        )
      }),
      columnHelper.accessor('actions', {
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <Tooltip title="Düzenle">
              <IconButton
                size='small'
                onClick={() => {
                  setSelectedbrand(row.original)
                  setEditbrandOpen(true)
                }}
              >
                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
              </IconButton>
            </Tooltip>
          </div>
        ),
        enableSorting: false
      })
    ],
    [data]
  )

  const table = useReactTable({
    data,
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

  if (error) {
    return (
      <Card>
        <div className='p-5 text-center'>
          <Typography color='error'>Hata: {error}</Typography>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Marka adı ile arama'
            className='max-sm:is-full'
          />
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
            <Button
              color='secondary'
              fullWidth
              variant='outlined'
              className='max-sm:is-full is-auto'
              startIcon={<i className='ri-upload-2-line' />}
            >
              Dışarı Aktar
            </Button>
          </div>
        </div>
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
                    Veri bulunamadı
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table
                  .getRowModel()
                  .rows.slice(0, table.getState().pagination.pageSize)
                  .map(row => (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            )}
          </table>
        </div>
        <TablePagination
          rowsPerPageOptions={[10, 15, 25]}
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

      <EditbrandDrawer
        open={EditbrandOpen}
        brandData={data}
        selectedbrand={selectedbrand}
        setData={setData}
        handleClose={() => setEditbrandOpen(false)}
      />
    </>
  )
}

export default BrandListTable