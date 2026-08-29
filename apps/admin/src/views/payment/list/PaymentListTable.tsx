'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import classnames from 'classnames'

/* MUI */
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import type { TextFieldProps } from '@mui/material/TextField'

/* Dialog */
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

/* Add Payment Method Drawer */
import AddPaymentMethodDrawer from '../add/AddPaymentMethodDrawer'
import EditPaymentMethodDrawer from '../edit/EditPaymentMethodDrawer'


/* Toast */
import { toast } from 'react-toastify'

import { fetchAPI } from '@libs/api'

/* Tanstack */
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

/* Types */
type PaymentMethodType = {
  _id: string
  type: 'credit_card' | 'bank_transfer' | 'cash_on_delivery'
  provider: string
  name: string
  description?: string
  isActive: boolean
  priority: number
  providerMeta?: {
    displayName?: string
    logo?: string
    color?: string
    icon?: string
  }
  creditCardSettings?: {
    mode?: 'test' | 'live' | 'sandbox'
    has3DSecure?: boolean
    hasInstallment?: boolean
    maxInstallment?: number
  }
  bankTransferSettings?: {
    accountName?: string
    iban?: string
    branchName?: string
  }
  stats?: {
    totalOrders?: number
    totalAmount?: number
  }
  createdAt: string
  updatedAt: string
}

type PaymentMethodWithActionsType = PaymentMethodType & {
  actions?: string
}

type PaymentMethodListTableProps = {
  methodData?: PaymentMethodType[]
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

const columnHelper = createColumnHelper<PaymentMethodWithActionsType>()

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

const PaymentMethodListTable = ({ methodData }: PaymentMethodListTableProps) => {
  const router = useRouter()
  const [rowSelection, setRowSelection] = useState({})
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [data, setData] = useState<PaymentMethodType[]>(methodData || [])
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethodType | null>(null)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [methodToEdit, setMethodToEdit] = useState<PaymentMethodType | null>(null)

  // Liste, aktif site başlığıyla İSTEMCİ tarafında yüklenir (sunucu fetch'i X-Site gönderemiyordu
  // ve sayfa hep ALastik yöntemlerini gösteriyordu)
  const loadMethods = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
      const result = await fetchAPI(`${baseUrl}/admin/settings/payment`)
      if (result?.success !== false) setData(result.data || [])
    } catch (e) {
      console.error('Ödeme yöntemleri yüklenemedi:', e)
    }
  }

  useEffect(() => {
    loadMethods()
  }, [])

  useEffect(() => {
    if (methodData && methodData.length) setData(methodData)
  }, [methodData])

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const result = await fetchAPI(`${baseUrl}/admin/settings/payment/${id}/toggle`, {
        method: 'PATCH'
      })

      if (result.success) {
        toast.success(result.message)

        // Veriyi güncelle
        setData(prevData =>
          prevData.map(item =>
            item._id === id ? { ...item, isActive: !currentStatus } : item
          )
        )
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Durum değiştirilemedi')
    }
  }

  const handleDeleteClick = (method: PaymentMethodType) => {
    setMethodToDelete(method)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!methodToDelete) return

    try {
      const result = await fetchAPI(`${baseUrl}/admin/settings/payment/${methodToDelete._id}`, {
        method: 'DELETE'
      })

      if (result.success) {
        toast.success(`"${methodToDelete.name}" ödeme yöntemi arşivlendi`)
        setDeleteConfirmOpen(false)
        setMethodToDelete(null)

        // Veriyi güncelle
        setData(prevData => prevData.filter(item => item._id !== methodToDelete._id))
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error('Ödeme yöntemi arşivlenirken hata oluştu')
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setMethodToDelete(null)
  }

  const getTypeBadge = (type: string) => {
    const badges = {
      credit_card: { label: 'Kredi Kartı', color: 'primary' as const },
      bank_transfer: { label: 'Banka Havalesi', color: 'success' as const },
      cash_on_delivery: { label: 'Kapıda Ödeme', color: 'warning' as const }
    }
    return badges[type as keyof typeof badges] || { label: type, color: 'default' as const }
  }

  const getModeBadge = (mode?: string) => {
    if (!mode) return null
    const badges = {
      test: { label: 'Test' as const },
      live: { label: 'Canlı' as const },
      sandbox: { label: 'Sandbox' as const }
    }
    return badges[mode as keyof typeof badges] || { label: mode, color: 'default' as const }
  }
  const handleEdit = (method: PaymentMethodType) => {
    setMethodToEdit(method)
    setEditDrawerOpen(true)
  }

  const handleEditSuccess = () => {
    setEditDrawerOpen(false)
    setMethodToEdit(null)
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }

  const columns = useMemo<ColumnDef<PaymentMethodWithActionsType, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Ödeme Yöntemi',
        cell: ({ row }) => {
          const badge = getTypeBadge(row.original.type)
          return (
            <div className='flex items-center gap-3'>
              <div className='flex flex-col'>
                <Typography className='font-medium' color='text.primary'>
                  {row.original.name}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {badge.label}
                </Typography>
              </div>
            </div>
          )
        }
      }),
      columnHelper.accessor('creditCardSettings.mode', {
        header: 'Mod',
        cell: ({ row }) => {
          const mode = row.original.creditCardSettings?.mode
          if (!mode) return <Typography variant='body2' color='text.secondary'>-</Typography>
          const badge = getModeBadge(mode)
          if (!badge) return null
          return (
            <Typography>{badge.label}</Typography>
          )
        }
      }),
      columnHelper.accessor('isActive', {
        header: 'Durum',
        cell: ({ row }) => (
          <Switch
            checked={row.original.isActive}
            onChange={() => handleToggle(row.original._id, row.original.isActive)}
            color='success'
          />
        )
      }),
      columnHelper.accessor('priority', {
        header: 'Öncelik',
        cell: ({ row }) => (
          <Typography className='font-medium'>
            {row.original.priority}
          </Typography>
        )
      }),
      columnHelper.accessor('actions', {
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className='flex items-end-safe'>
            <Tooltip title='Düzenle'>
              <IconButton
                size='small'
                onClick={() => handleEdit(row.original)}
              >
                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Sil'>
              <IconButton size='small' onClick={() => handleDeleteClick(row.original)}>
                <i className='ri-archive-line text-[22px] text-textSecondary' />
              </IconButton>
            </Tooltip>
          </div>
        ),
        enableSorting: false
      })
    ],
    [router]
  )

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) {
      return []
    }
    return data.filter(item => {
      const matchesType = !typeFilter || item.type === typeFilter
      const matchesStatus = !statusFilter || String(item.isActive) === statusFilter
      return matchesType && matchesStatus
    })
  }, [data, typeFilter, statusFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { rowSelection, globalFilter },
    initialState: { pagination: { pageSize: 10 } },
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
  const handleAddSuccess = () => {
    window.location.reload()
  }
  return (
    <>
      <Card>
        {/* Filtreler ve Butonlar */}
        <div className='flex flex-col gap-4 p-5'>
          <div className='flex items-start justify-end flex-wrap gap-4'>
            <Button
              color='primary'
              variant='contained'
              className='is-full sm:is-auto'
              startIcon={<i className='ri-add-line' />}
              onClick={() => setAddDrawerOpen(true)}
            >
              Yeni Ödeme Yöntemi Ekle
            </Button>
          </div>
        </div>

        {/* Tablo */}
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
                    Ödeme Yöntemi Bulunamadı
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table.getRowModel().rows.slice(0, table.getState().pagination.pageSize).map(row => (
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

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 15, 25]}
          component='div'
          className='border-bs'
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, page) => table.setPageIndex(page)}
          onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
        />
      </Card>
      <EditPaymentMethodDrawer
        open={editDrawerOpen}
        handleClose={() => setEditDrawerOpen(false)}
        onSuccess={handleEditSuccess}
        method={methodToEdit}
      />
      <AddPaymentMethodDrawer
        open={addDrawerOpen}
        handleClose={() => setAddDrawerOpen(false)}
        onSuccess={handleAddSuccess}
      />
      {/* Silme Onay Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Ödeme Yöntemini Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>"{methodToDelete?.name}"</strong> ödeme yöntemini silmek istediğinizden emin misiniz?
            <br />
            <br />
            Bu işlem ödeme yöntemini silecektir. Geçmiş işlemler korunacaktır.
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

export default PaymentMethodListTable