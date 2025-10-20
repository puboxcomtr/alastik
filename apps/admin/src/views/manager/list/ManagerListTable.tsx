'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'

// Third-party Imports
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
import type { ColumnDef } from '@tantml/react-table'

// Type Imports
import type { AdminType } from '@/app/[lang]/(dashboard)/(private)/apps/manager/list/page'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

const columnHelper = createColumnHelper<AdminType>()

const ManagerListTable = ({ managersData }: { managersData: AdminType[] }) => {
    const [rowSelection, setRowSelection] = useState({})
    const [data] = useState(() => managersData)
    const [globalFilter, setGlobalFilter] = useState('')

    const { lang: locale } = useParams()

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
            columnHelper.accessor('permissions', {
                header: 'Yetkiler',
                cell: ({ row }) => {
                    const permissions = Array.isArray(row.original.permissions)
                        ? row.original.permissions
                        : [];

                    return (
                        <Tooltip title={permissions.length > 0 ? permissions.join(', ') : 'Yetki yok'}>
                            <Chip
                                label={`${permissions.length} Yetki`}
                                size='small'
                                variant='outlined'
                            />
                        </Tooltip>
                    )
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
                            <IconButton size='small'>
                                <i className='ri-edit-box-line text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton size='small'>
                                <i className='ri-delete-bin-7-line text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
                enableSorting: false
            }
        ],
        [data]
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
    )
}

export default ManagerListTable
