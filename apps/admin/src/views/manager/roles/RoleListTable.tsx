'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'

import classnames from 'classnames'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'

import type { RoleType } from '@/app/[lang]/(dashboard)/(private)/apps/manager/roles/list/page'

import { deleteRole } from '@/utils/api/roles'

import tableStyles from '@core/styles/table.module.css'

const columnHelper = createColumnHelper<RoleType>()

const RoleListTable = ({ rolesData }: { rolesData: RoleType[] }) => {
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState(() => rolesData)
  const [globalFilter, setGlobalFilter] = useState('')
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<RoleType | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const router = useRouter()
  const { lang: locale } = useParams()

  const handleDeleteClick = (role: RoleType) => {
    setRoleToDelete(role)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return

    setDeleteLoading(true)

    try {
      await deleteRole(roleToDelete._id)
      
      setData(prevData => prevData.filter(r => r._id !== roleToDelete._id))
      
      toast.success(`"${roleToDelete.name}" rolü başarıyla silindi`)
      setDeleteDialogOpen(false)
      setRoleToDelete(null)
      
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Rol silinirken bir hata oluştu')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setRoleToDelete(null)
  }

  const columns = useMemo<ColumnDef<RoleType, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Rol Adı',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Typography variant='body2' fontWeight='bold' color='text.primary'>
              {row.original.name}
            </Typography>
            {row.original.isSystem && (
              <Chip label='Sistem' size='small' color='primary' variant='outlined' />
            )}
          </div>
        )
      }),
      columnHelper.accessor('description', {
        header: 'Açıklama',
        cell: ({ row }) => (
          <Typography variant='body2' color='text.secondary'>
            {row.original.description || '-'}
          </Typography>
        )
      }),
      columnHelper.accessor('permissions', {
        header: 'Yetkiler',
        cell: ({ row }) => {
          const permissions = row.original.permissions || []
          const totalActions = permissions.reduce((sum, p) => {
            return sum + (p.view ? 1 : 0) + (p.create ? 1 : 0) + (p.edit ? 1 : 0) + (p.delete ? 1 : 0) + (p.sync ? 1 : 0)
          }, 0)

          return (
            <Tooltip title={`${totalActions} aktif yetki`}>
                <Chip
                  label={`${permissions.length} Modül`}
                  size='small'
                  variant='outlined'
                />
            </Tooltip>
          )
        }
      }),
      columnHelper.accessor('userCount', {
        header: 'Kullanıcı Sayısı',
        cell: ({ row }) => (
          <Chip
            label={`${row.original.userCount || 0} Kullanıcı`}
            size='small'
            color={row.original.userCount ? 'success' : 'default'}
            variant='tonal'
          />
        )
      }),
      columnHelper.accessor('createdAt', {
        header: 'Oluşturma Tarihi',
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt)
          return (
            <Typography variant='body2'>
              {date.toLocaleDateString('tr-TR')}
            </Typography>
          )
        }
      }),
      {
        id: 'actions',
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Tooltip title='Düzenle'>
              <IconButton
                size='small'
                onClick={() => router.push(`/${locale}/apps/manager/roles/edit/${row.original._id}`)}
              >
                <i className='ri-edit-box-line text-textSecondary' />
              </IconButton>
            </Tooltip>
            <Tooltip title={row.original.isSystem ? 'Sistem rolleri silinemez' : 'Sil'}>
              <span>
                <IconButton
                  size='small'
                  disabled={row.original.isSystem}
                  onClick={() => handleDeleteClick(row.original)}
                >
                  <i className='ri-delete-bin-7-line text-textSecondary' />
                </IconButton>
              </span>
            </Tooltip>
          </div>
        ),
        enableSorting: false
      }
    ],
    [data, locale, router]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: (row) => !row.original.isSystem,
    globalFilterFn: 'includesString',
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <>
      <Card>
        <CardHeader
          title='Yetki Rolleri'
          action={
            <Button
              variant='contained'
              color='primary'
              startIcon={<i className='ri-add-line' />}
              onClick={() => router.push('/apps/manager/roles/add')}
            >
              Yeni Rol Ekle
            </Button>
          }
        />
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
                    Rol Bulunamadı
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

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component='div'
            className='border-bs'
            count={table.getFilteredRowModel().rows.length}
            rowsPerPage={table.getState().pagination.pageSize}
            page={table.getState().pagination.pageIndex}
            onPageChange={(_, page) => table.setPageIndex(page)}
            onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
          />
        </div>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onClose={deleteLoading ? undefined : handleDeleteCancel}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Rolü Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{roleToDelete?.name}" rolünü silmek istediğinizden emin misiniz?
            {roleToDelete?.userCount ? ` Bu role sahip ${roleToDelete.userCount} kullanıcı var.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            disabled={deleteLoading}
            color='secondary'
          >
            İptal
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
            variant='contained'
            color='error'
            startIcon={deleteLoading ? <CircularProgress size={20} /> : null}
          >
            {deleteLoading ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default RoleListTable