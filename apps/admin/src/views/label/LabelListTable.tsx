'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import classnames from 'classnames'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// MUI Imports
import type { TextFieldProps } from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import { toast } from 'react-toastify'

// Tanstack Imports
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

type TagType = {
  _id: string
  title: string
  seoUrl: string
  order: number
  isActive: boolean
  productCount: number
}

type TagWithActionsType = TagType & {
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

const columnHelper = createColumnHelper<TagWithActionsType>()

const LabelListTable = () => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<TagType | null>(null)
  const router = useRouter()
  const { lang: locale } = useParams()
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<TagType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadTags()
  }, [page, limit])

  const loadTags = async () => {
    setLoading(true)
    try {
      const response = await fetchAPI(
        `${API_ENDPOINTS.labels.list()}?page=${page}&limit=${limit}`,
        { cache: 'no-store' }
      )

      const tags = (response.data || []).map((tag: any) => ({
        _id: tag._id || tag.id,
        title: tag.title || '',
        seoUrl: tag.seoUrl || '',
        order: tag.order || 0,
        isActive: tag.isActive !== false,
        productCount: tag.productCount || 0
      }))

      setData(tags)
      setTotalCount(response.meta?.total || tags.length)
    } catch (error) {
      console.error('Tags fetch error:', error)
      toast.error('Etiketler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (tag: TagType) => {
    setTagToDelete(tag)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return

    try {
      await fetchAPI(API_ENDPOINTS.labels.detail(tagToDelete._id), {
        method: 'DELETE'
      })
      toast.success(`"${tagToDelete.title}" etiketi silindi`)
      setDeleteConfirmOpen(false)
      setTagToDelete(null)
      await loadTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Etiket silinirken hata oluştu')
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setTagToDelete(null)
  }

  const columns = useMemo<ColumnDef<TagWithActionsType, any>[]>(
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
      columnHelper.accessor('title', {
        header: 'Etiket Adı',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <div className='flex flex-col items-start'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.title}
              </Typography>
              <Typography variant='body2'>
                {row.original.productCount} adet üründe kullanılıyor
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('seoUrl', {
        header: 'SEO URL',
        cell: ({ row }) => (
          <Typography variant='body2' color='text.secondary'>
            /etiket/{row.original.seoUrl}
          </Typography>
        )
      }),
      columnHelper.accessor('order', {
        header: 'Öncelik',
        cell: ({ row }) => <Typography>{row.original.order}</Typography>
      }),
      columnHelper.accessor('isActive', {
        header: 'Durum',
        cell: ({ row }) => (
          <Typography color={row.original.isActive ? 'success.main' : 'error.main'}>
            {row.original.isActive ? 'Aktif' : 'Pasif'}
          </Typography>
        )
      }),
      columnHelper.accessor('actions', {
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <Tooltip title="Düzenle">
              <IconButton
                size='small'
                onClick={() => router.push(`/${locale}/apps/label/edit/${row.original._id}`)}
              >
                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sil">
              <IconButton
                size='small'
                onClick={() => handleDeleteClick(row.original)}
              >
                <i className='ri-delete-bin-line text-[22px] text-textSecondary' />
              </IconButton>
            </Tooltip>
          </div>
        ),
        enableSorting: false
      })
    ],
    [locale]
  )

  const table = useReactTable({
    data,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { rowSelection, globalFilter },
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
        <CardHeader title='Etiket Listesi' className='pbe-4' />
        <Divider />
        <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
          <div className='flex flex-col gap-2'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Etiket adı ile arama'
              className='max-sm:is-full'
            />
            <Typography variant='body2' color='text.secondary'>
              Toplam <strong>{totalCount} Etiket</strong> bulundu
            </Typography>
          </div>
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
            <Button
              color='primary'
              fullWidth
              variant='contained'
              className='max-sm:is-full is-auto'
              startIcon={<i className='ri-add-line' />}
              onClick={() => router.push(`/${locale}/apps/label/add`)}
            >
              Yeni Etiket Ekle
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
                <Typography>Etiketler yükleniyor...</Typography>
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
                        {globalFilter ? 'Arama kriterlerinize uygun etiket bulunamadı' : 'Etiket bulunamadı'}
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

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Etiketi Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>"{tagToDelete?.title}"</strong> etiketini silmek istediğinizden emin misiniz?
            {tagToDelete && tagToDelete.productCount > 0 && (
              <span style={{ display: 'block', marginTop: '8px', color: '#f44336' }}>
                Bu etiket {tagToDelete.productCount} üründe kullanılıyor.
              </span>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color='secondary'>
            İptal
          </Button>
          <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default LabelListTable