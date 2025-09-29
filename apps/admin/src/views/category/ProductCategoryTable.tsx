'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Types Imports
import type { CategoryType } from '@/types/apps/productTypes'

// MUI Imports
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'

import type { TextFieldProps } from '@mui/material/TextField'

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
import EditCategoryDrawer from './EditCategoryDrawer'

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

type CategoryWithActionsType = CategoryType & {
  actions?: string
}

interface ProductCategoryTableProps {
  categoryData: CategoryType[]
  totalCategories: number
  error?: string | null
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

const ProductCategoryTable = ({ categoryData, totalCategories, error }: ProductCategoryTableProps) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null)
  const [EditCategoryOpen, setEditCategoryOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<CategoryType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    setData(categoryData || [])
  }, [categoryData])

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
                <Typography
                  className='font-medium'
                  color='text.primary'
                >
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
                onClick={() => {
                  setSelectedCategory(row.original)
                  setEditCategoryOpen(true)
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

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Kategori verileri yüklenirken hata oluştu: {error}
        </Alert>
      )}

      <Card>
        <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
          <div className='flex flex-col gap-2'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Kategori adı ile arama'
              className='max-sm:is-full'
            />
            <Typography variant='body2' color='text.secondary'>
              Toplam <strong>{data.length} Kategori</strong> bulundu
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
          rowsPerPageOptions={[10, 15, 25, 50]}
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

      <EditCategoryDrawer
        open={EditCategoryOpen}
        categoryData={data}
        selectedCategory={selectedCategory}
        setData={setData}
        handleClose={() => setEditCategoryOpen(false)}
      />
    </>
  )
}

export default ProductCategoryTable