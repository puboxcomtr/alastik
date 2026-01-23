'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BrandType } from '@/types/apps/brandTypes'

// API Imports
import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import type { TextFieldProps } from '@mui/material/TextField'
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

const BrandListTable = () => {
  const [selectedbrand, setSelectedbrand] = useState<any | null>(null)
  const [EditbrandOpen, setEditbrandOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<any[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true)
      try {
        const response = await fetchAPI(
          `${API_ENDPOINTS.brands.list()}?page=${page}&limit=${limit}`,
          { cache: 'no-store' }
        )

        const brands = (response.data || []).map((brand: any) => ({
          id: brand._id || brand.id,
          name: brand.diaMarkaAck || brand.name || '',
          description: brand.description || '',
          seoTitle: brand.seoTitle || brand.name || '',
          seoDescription: brand.seoDescription || '',
          seoUrl: brand.seoUrl || '',
          productCount: brand.productCount || 0,
          webOrder: brand.webOrder || 0,
          logo: brand.logo || null,
          status: brand.status || 'Inactive',
          completenessScore: brand.completenessScore || 0,
          totalStock: brand.totalStock || 0,
          showOnHomepage: brand.showOnHomepage || false,
          priceRange: {
            averageFormatted: brand.priceRange?.averageFormatted || '₺0'
          }
        }))

        setData(brands)
        setTotalCount(response.meta?.total || brands.length)
      } catch (error) {
        console.error('Brands fetch error:', error)
        toast.error('Markalar Yüklenirken Hata Oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchBrands()
  }, [page, limit])

  // Anasayfa gösterim durumunu güncelle
  const handleHomepageToggle = async (brandId: string, currentValue: boolean) => {
    try {
      const result = await fetchAPI(API_ENDPOINTS.brands.detail(brandId), {
        method: 'PUT',
        body: JSON.stringify({ showOnHomepage: !currentValue })
      })

      if (result.success) {
        setData(prev =>
          prev.map(brand =>
            brand.id === brandId
              ? { ...brand, showOnHomepage: !currentValue }
              : brand
          )
        )
        toast.success(!currentValue ? 'Marka Anasayfada Gösterilecek' : 'Marka Anasayfadan Kaldırıldı')
      } else {
        toast.error('Güncelleme Başarısız')
      }
    } catch (err) {
      console.error('Homepage toggle error:', err)
      toast.error('Bir hata olustu')
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
          const brand = row.original
          const defaultImage = 'https://api.alastik.com/theme/katalog-gorseli.jpg'
          const logoSrc = brand.logo ? getImageUrl(brand.logo) : defaultImage

          return (
            <div className='flex items-center gap-3'>
              <img
                src={logoSrc}
                width={38}
                height={38}
                className='rounded bg-actionHover object-contain'
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = defaultImage
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
          )
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
    pageCount: Math.ceil(totalCount / limit),
    manualPagination: true,
    enableRowSelection: true,
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  return (
    <>
      <Card>
        <CardHeader title='Marka Listesi' className='pbe-4' />
        <Divider />
        <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
          <div className='flex flex-col gap-2'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Marka adi ile arama'
              className='max-sm:is-full'
            />
            <Typography variant='body2' color='text.secondary'>
              Toplam <strong>{totalCount} Marka</strong> bulundu
            </Typography>
          </div>
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
                <Typography>Markalar Yükleniyor...</Typography>
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
                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center py-4'>
                      <Typography variant='body1' color='text.secondary'>
                        {globalFilter ? 'Arama kriterlerinize uygun marka bulunamadi' : 'Marka bulunamadi'}
                      </Typography>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {table.getRowModel().rows.map(row => (
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
        </div>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 200]}
          component='div'
          className='border-bs'
          count={totalCount}
          rowsPerPage={limit}
          page={page - 1}
          onPageChange={(_, newPage) => {
            setPage(newPage + 1)
          }}
          onRowsPerPageChange={e => {
            setLimit(Number(e.target.value))
            setPage(1)
          }}
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