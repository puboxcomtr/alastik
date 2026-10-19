'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
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

import type { AdminType } from '@/app/[lang]/(dashboard)/(private)/apps/manager/list/page'

import { deleteAdmin } from '@/utils/api/admins'

import tableStyles from '@core/styles/table.module.css'

const columnHelper = createColumnHelper<AdminType>()

const ManagerListTable = ({ managersData }: { managersData: AdminType[] }) => {
    const router = useRouter()
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState(() => managersData)
    const [globalFilter, setGlobalFilter] = useState('')

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [adminToDelete, setAdminToDelete] = useState<AdminType | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleDeleteClick = (admin: AdminType) => {
        setAdminToDelete(admin)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!adminToDelete) return

        setDeleteLoading(true)

        try {
            await deleteAdmin(adminToDelete._id)

            setData(prevData => prevData.filter(a => a._id !== adminToDelete._id))

            toast.success(`"${adminToDelete.name}" başarıyla silindi`, {
                autoClose: 1500
            })

            setDeleteDialogOpen(false)
            setAdminToDelete(null)

            setTimeout(() => {
                router.refresh()
            }, 500)
        } catch (error: any) {
            toast.error(error.message || 'Yönetici silinirken bir hata oluştu')
        } finally {
            setDeleteLoading(false)
        }
    }

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false)
        setAdminToDelete(null)
    }

    const columns = useMemo<ColumnDef<AdminType, any>[]>(
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
                header: 'Yönetici',
                cell: ({ row }) => (
                    <div className='flex items-center gap-3'>
                        <Avatar
                            src={row.original.avatar || undefined}
                            sx={{ width: 38, height: 38 }}
                        >
                            {row.original.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <div className='flex flex-col'>
                            <Typography variant='body2' fontWeight='bold' color='text.primary'>
                                {row.original.name}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {row.original.email}
                            </Typography>
                        </div>
                    </div>
                )
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => (
                    <Chip
                        label={row.original.isActive ? 'Aktif' : 'Pasif'}
                        size='small'
                        color={row.original.isActive ? 'success' : 'error'}
                        variant='tonal'
                    />
                )
            }),
            columnHelper.accessor('role', {
                header: 'Rol',
                cell: ({ row }) => {
                    const role = row.original.role;

                    if (role && typeof role === 'object' && 'name' in role) {
                        return (
                            <Chip
                                label={role.name}
                                size='small'
                                variant='outlined'
                                color='primary'
                            />
                        );
                    }

                    return (
                        <Chip
                            label='Rol Yok'
                            size='small'
                            variant='outlined'
                            color='default'
                        />
                    );
                }
            }),
            columnHelper.accessor('lastLogin', {
                header: 'Son Giriş Tarihi',
                cell: ({ row }) => {
                    if (!row.original.lastLogin) {
                        return <Typography variant='body2' color='text.secondary'>Hiç giriş yapmadı</Typography>
                    }

                    const date = new Date(row.original.lastLogin)
                    return (
                        <Typography variant='body2'>
                            {date.toLocaleDateString('tr-TR')} {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                    )
                }
            }),
            columnHelper.accessor('createdAt', {
                header: 'Oluşturma Tarihi',
                cell: ({ row }) => {
                    const date = new Date(row.original.createdAt)
                    return (
                        <Typography variant='body2'>
                            {date.toLocaleDateString('tr-TR')} {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
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
                                onClick={() => router.push(`/apps/manager/edit/${row.original._id}`)}
                            >
                                <i className='ri-edit-box-line text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton
                                size='small'
                                onClick={() => handleDeleteClick(row.original)}
                            >
                                <i className='ri-delete-bin-7-line text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
                enableSorting: false
            }
        ],
        [data, router]
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
        enableRowSelection: true,
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
                                    Yönetici Bulunamadı
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

            <Dialog
                open={deleteDialogOpen}
                onClose={deleteLoading ? undefined : handleDeleteCancel}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>Yöneticiyi Sil</DialogTitle>
                <DialogContent>
                    <Typography>
                        "{adminToDelete?.name}" kullanıcısını silmek istediğinizden emin misiniz?
                        Bu işlem geri alınamaz.
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

export default ManagerListTable