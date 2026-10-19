'use client'
import { useRouter, useParams } from 'next/navigation'

import { useEffect, useMemo, useState } from 'react'

import type { CategoryType } from '@/types/apps/productTypes'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'

import type { TextFieldProps } from '@mui/material/TextField'

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

import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type CategoryWithActionsType = CategoryType & {
  actions?: string
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

const columnHelper = createColumnHelper<CategoryWithActionsType>()

const ProductCategoryTable = () => {
  const router = useRouter()
  const params = useParams()
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null)
  const [EditCategoryOpen, setEditCategoryOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<CategoryType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
      try {
        const response = await fetchAPI(
          `${API_ENDPOINTS.categories.list()}?page=${page}&limit=${limit}`,
          { cache: 'no-store' }
        )

        const categories = (response.data || []).map((category: any) => ({
          id: category._id || category.id,
          name: category.name || '',
          slug: category.slug || '',
          level: category.level || 1,
          parent: category.parent || null,
          parentPath: category.parentPath || [],
          diaCategory: category.diaCategory || '',
          diaLevel: category.diaLevel || '',
          webVisible: category.webVisible !== false,
          webOrder: category.webOrder || 0,
          seoTitle: category.seoTitle || category.name || '',
          seoDescription: category.seoDescription || '',
          seoUrl: category.seoUrl || category.slug || '',
          seoKeywords: category.seoKeywords || [],
          description: category.description || '',
          sliderId: category.sliderId || null,
          productCount: category.productCount || 0,
          activeProductCount: category.activeProductCount || 0,
          totalStock: category.totalStock || 0,
          syncInfo: category.syncInfo || {},
          showcase: category.showcase || [],
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }))

        setData(categories)
        setTotalCount(response.meta?.total || categories.length)
      } catch (error) {
        console.error('Categories fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [page, limit])

  const columns = useMemo<ColumnDef<CategoryWithActionsType, any>[]>(
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
        header: 'Kategori Adı',
        cell: ({ row }) => {
          const category = row.original
          let displayName = category.name
          let categoryInfo = ''
          if (category.level === 1) {
            displayName = category.name
            categoryInfo = 'Ana Kategori'
          } else if (category.level === 2) {
            displayName = category.name
            const parentName = typeof category.parent === 'string'
              ? category.parent
              : category.parent?.name

            const pathName = typeof category.parentPath === 'string'
              ? category.parentPath
              : parentName

            categoryInfo = pathName
              ? `${pathName} > ${category.name}`
              : 'Alt Kategori'
          } else if (category.level === 3) {
            displayName = category.name
            const parentNames = []
            if (typeof category.parentPath === 'string') {
              parentNames.push(category.parentPath)
            }
            const parentName = typeof category.parent === 'string'
              ? category.parent
              : category.parent?.name

            if (parentName) {
              parentNames.push(parentName)
            }

            categoryInfo = parentNames.length > 0
              ? `${parentNames.join(' > ')} > ${category.name}`
              : 'Alt-Alt Kategori'
          }

          return (
            <div className='flex items-center gap-3'>
              <div className='flex flex-col items-start'>
                <Typography className='font-medium' color='text.primary'>
                  {displayName}
                </Typography>
                <Typography variant='body2' color='text.disabled'>
                  {categoryInfo}
                </Typography>
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
      columnHelper.accessor('actions', {
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <Tooltip title="Kategori Düzenle">
              <IconButton
                size='small'
                onClick={() => router.push(`/${params.lang}/apps/category/edit/${row.original.id}`)}
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
        <CardHeader title='Kategori Listesi' className='pbe-4' />
        <Divider />
        <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
          <div className='flex flex-col gap-2'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Kategori adı ile arama'
              className='max-sm:is-full'
            />
            <Typography variant='body2' color='text.secondary'>
              Toplam <strong>{totalCount} Kategori</strong> bulundu
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
                <Typography>Kategoriler yukleniyor...</Typography>
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
                        {globalFilter ? 'Arama kriterlerinize uygun kategori bulunamadı' : 'Kategori bulunamadı'}
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
    </>
  )
}

export default ProductCategoryTable