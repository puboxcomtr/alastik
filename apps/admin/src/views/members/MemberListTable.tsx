'use client'

// Site Üyeleri listesi — ürün listesiyle aynı tablo deseni (TanStack + tableStyles)
import { useCallback, useEffect, useMemo, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import classnames from 'classnames'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type MemberType = {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    status: 'pending' | 'active' | 'suspended' | 'deleted'
    marketingConsent: boolean
    diaCustomerCode?: string
    orderCount: number
    createdAt: string
    lastLoginAt?: string
}

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
    active: { label: 'Aktif', color: 'success' },
    pending: { label: 'Onay Bekliyor', color: 'warning' },
    suspended: { label: 'Askıda', color: 'error' },
    deleted: { label: 'Silinmiş', color: 'default' }
}

const columnHelper = createColumnHelper<MemberType>()

const MemberListTable = () => {
    const [data, setData] = useState<MemberType[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('')

    // Sunucu taraflı sayfalama
    const [page, setPage] = useState(0)
    const [limit, setLimit] = useState(100)
    const [total, setTotal] = useState(0)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.members.list({ search, status, page: page + 1, limit }))
            if (res.success) {
                setData(res.data || [])
                setTotal(res.meta?.total || 0)
            } else {
                toast.error(res.message || 'Üyeler yüklenemedi')
            }
        } catch {
            toast.error('Üyeler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }, [search, status, page, limit])

    useEffect(() => {
        const timer = setTimeout(load, search ? 400 : 0)
        return () => clearTimeout(timer)
    }, [load, search])

    const columns = useMemo<ColumnDef<MemberType, any>[]>(
        () => [
            columnHelper.accessor('firstName', {
                header: 'Üye',
                cell: ({ row }) => (
                    <div className='flex flex-col items-start'>
                        <Typography className='font-medium' color='text.primary'>
                            {row.original.firstName} {row.original.lastName}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            {row.original.email}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('phone', {
                header: 'Telefon',
                cell: ({ row }) => <Typography variant='body2'>{row.original.phone || '-'}</Typography>
            }),
            columnHelper.accessor('status', {
                header: 'Durum',
                cell: ({ row }) => {
                    const meta = STATUS_META[row.original.status] || { label: row.original.status, color: 'default' as const }
                    return <Chip label={meta.label} color={meta.color} size='small' variant='tonal' />
                }
            }),
            columnHelper.accessor('orderCount', {
                header: 'Sipariş',
                cell: ({ row }) => (
                    <Typography variant='body2' className='font-medium'>{row.original.orderCount}</Typography>
                )
            }),
            columnHelper.accessor('diaCustomerCode', {
                header: 'DIA Cari',
                cell: ({ row }) => (
                    <Typography variant='body2' color='text.secondary'>{row.original.diaCustomerCode || '-'}</Typography>
                )
            }),
            columnHelper.accessor('createdAt', {
                header: 'Kayıt Tarihi',
                cell: ({ row }) => (
                    <Typography variant='body2'>
                        {new Date(row.original.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Typography>
                )
            }),
            columnHelper.accessor('lastLoginAt', {
                header: 'Son Giriş',
                cell: ({ row }) => (
                    <Typography variant='body2' color='text.secondary'>
                        {row.original.lastLoginAt
                            ? new Date(row.original.lastLoginAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : '-'}
                    </Typography>
                )
            }),
            columnHelper.accessor('_id', {
                header: 'İşlemler',
                enableSorting: false,
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='E-posta Gönder'>
                            <IconButton size='small' component='a' href={`mailto:${row.original.email}`}>
                                <i className='ri-mail-send-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Ara'>
                            <IconButton size='small' component='a' href={`tel:${(row.original.phone || '').replace(/\s/g, '')}`}>
                                <i className='ri-phone-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                )
            })
        ],
        []
    )

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true
    })

    return (
        <Card>
            <CardHeader title='Site Üyeleri' subheader={`${total} üye`} />
            <Divider />
            <div className='flex flex-wrap items-center gap-4 p-5'>
                <TextField
                    size='small'
                    placeholder='İsim, e-posta, telefon veya cari kodu ara...'
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                    className='max-w-[400px] w-full'
                />
                <TextField
                    select
                    size='small'
                    label='Durum'
                    value={status}
                    onChange={e => { setStatus(e.target.value); setPage(0) }}
                    className='min-w-[180px]'
                >
                    <MenuItem value=''>Tümü</MenuItem>
                    <MenuItem value='active'>Aktif</MenuItem>
                    <MenuItem value='pending'>Onay Bekliyor</MenuItem>
                    <MenuItem value='suspended'>Askıda</MenuItem>
                    <MenuItem value='deleted'>Silinmiş</MenuItem>
                </TextField>
            </div>
            {loading ? (
                <div className='flex justify-center py-12'><CircularProgress /></div>
            ) : (
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
                                                        'flex items-center cursor-pointer select-none': header.column.getCanSort()
                                                    })}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{ asc: <i className='ri-arrow-up-s-line text-xl' />, desc: <i className='ri-arrow-down-s-line text-xl' /> }[
                                                        header.column.getIsSorted() as 'asc' | 'desc'
                                                    ] ?? null}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length ? (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className='text-center py-10'>Üye bulunamadı</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <TablePagination
                component='div'
                count={total}
                page={page}
                rowsPerPage={limit}
                rowsPerPageOptions={[25, 50, 100, 200]}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={e => { setLimit(parseInt(e.target.value)); setPage(0) }}
            />
        </Card>
    )
}

export default MemberListTable
