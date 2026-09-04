'use client'

// Üyeler listesi — ürün listesiyle aynı tablo deseni (filtre kartı + TanStack tablo + sayfalama)
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import classnames from 'classnames'
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'react-toastify'

// Components Imports
import MemberTableFilters from './MemberTableFilters'
import MemberAnnotateDialog from './MemberAnnotateDialog'
import MemberDeleteDialog from './MemberDeleteDialog'
import type { MemberFilters } from './MemberTableFilters'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

import type { MemberRow } from './types'
import { fullName, formatTRY, formatDate } from './types'

const columnHelper = createColumnHelper<MemberRow>()

const MembersView = () => {
    const { lang: locale } = useParams()

    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<MemberRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState<MemberFilters>({ search: '', status: '', hasOrders: '', from: '', to: '' })

    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    const [annotateMember, setAnnotateMember] = useState<MemberRow | null>(null)
    const [deleteMember, setDeleteMember] = useState<MemberRow | null>(null)

    useEffect(() => {
        let cancelled = false

        const fetchMembers = async () => {
            setLoading(true)

            try {
                const res = await fetchAPI(
                    API_ENDPOINTS.members.list({ ...filters, page, limit, view: 'table' }),
                    { cache: 'no-store' }
                )

                if (cancelled) return

                if (res.success) {
                    setData(res.data || [])
                    setTotalCount(res.meta?.total || 0)
                } else {
                    toast.error(res.message || 'Üyeler yüklenemedi')
                }
            } catch (error) {
                if (cancelled) return
                console.error('Members fetch error:', error)
                toast.error('Üyeler yüklenemedi')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchMembers()

        return () => {
            cancelled = true
        }
    }, [filters, page, limit])

    const columns = useMemo<ColumnDef<MemberRow, any>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllRowsSelected()}
                        indeterminate={table.getIsSomeRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox checked={row.getIsSelected()} disabled={!row.getCanSelect()} onChange={row.getToggleSelectedHandler()} />
                )
            },
            columnHelper.accessor('firstName', {
                header: 'Üye',
                cell: ({ row }) => {
                    const m = row.original

                    return (
                        <div className='flex flex-col'>
                            <Tooltip title='Üye Detayı'>
                                <Link href={`/${locale}/apps/user/view/${m._id}`}>
                                    <Typography variant='body2' fontWeight='bold' color='text.primary'>{fullName(m)}</Typography>
                                </Link>
                            </Tooltip>
                            <Typography variant='body2' color='text.secondary'>{m.email}</Typography>
                            {m.adminTags?.length ? (
                                <div className='flex flex-wrap gap-1 mbs-1'>
                                    {m.adminTags.map(tag => <Chip key={tag} size='small' variant='tonal' color='primary' label={tag} />)}
                                </div>
                            ) : null}
                        </div>
                    )
                }
            }),
            columnHelper.accessor('phone', {
                header: 'Telefon',
                cell: ({ row }) => <Typography variant='body2'>{row.original.phone || '—'}</Typography>
            }),
            columnHelper.accessor('createdAt', {
                header: 'Kayıt Tarihi',
                cell: ({ row }) => <Typography variant='body2'>{formatDate(row.original.createdAt)}</Typography>
            }),
            columnHelper.accessor('orderCount', {
                header: 'Sipariş',
                cell: ({ row }) => (
                    <Typography variant='body2' fontWeight='bold' color={row.original.orderCount ? 'text.primary' : 'text.secondary'}>
                        {row.original.orderCount.toLocaleString('tr-TR')}
                    </Typography>
                )
            }),
            columnHelper.accessor('totalSpend', {
                header: 'Toplam Harcama',
                cell: ({ row }) => (
                    <Typography variant='body2' fontWeight='bold' color={row.original.totalSpend ? 'text.primary' : 'text.secondary'}>
                        {row.original.totalSpend ? `${formatTRY(row.original.totalSpend)} TL` : '—'}
                    </Typography>
                )
            }),
            columnHelper.display({
                id: 'cart',
                header: 'Sepeti',
                cell: ({ row }) => {
                    const cart = row.original.cart

                    return cart && cart.itemCount > 0 ? (
                        <Chip size='small' variant='tonal' color='success' icon={<i className='ri-shopping-cart-2-line' />} label={`${cart.itemCount} adet · ${formatTRY(cart.total)} TL`} />
                    ) : (
                        <Typography variant='body2' color='text.disabled'>—</Typography>
                    )
                }
            }),
            columnHelper.display({
                id: 'actions',
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='Üye Detayı'>
                            <Link href={`/${locale}/apps/user/view/${row.original._id}`}>
                                <IconButton size='small'><i className='ri-eye-line' /></IconButton>
                            </Link>
                        </Tooltip>
                        <Tooltip title='Etiket / Not'>
                            <IconButton size='small' onClick={() => setAnnotateMember(row.original)}><i className='ri-edit-box-line' /></IconButton>
                        </Tooltip>
                        {row.original.status !== 'deleted' ? (
                            <Tooltip title='Üyeyi Sil'>
                                <IconButton size='small' onClick={() => setDeleteMember(row.original)}><i className='ri-delete-bin-line' /></IconButton>
                            </Tooltip>
                        ) : null}
                    </div>
                )
            })
        ],
        [locale]
    )

    const table = useReactTable({
        data,
        columns,
        state: { rowSelection },
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel()
    })

    return (
        <>
            <Card>
                <MemberTableFilters onFilterChange={f => { setFilters(f); setPage(1) }} />
                <Divider />
                <div style={{ position: 'relative' }}>
                    {loading && (
                        <div
                            className='flex items-center justify-center'
                            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 1000, minHeight: '200px' }}
                        >
                            <div className='flex items-center gap-3'>
                                <CircularProgress size={24} />
                                <Typography>Üyeler yükleniyor...</Typography>
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
                            {table.getRowModel().rows.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                            Üye Bulunamadı
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
                    rowsPerPageOptions={[50, 100, 200, 500]}
                    component='div'
                    className='border-bs'
                    count={totalCount}
                    rowsPerPage={limit}
                    page={page - 1}
                    onPageChange={(_, newPage) => setPage(newPage + 1)}
                    onRowsPerPageChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                    labelRowsPerPage='Sayfa başına'
                />
            </Card>

            <MemberAnnotateDialog
                member={annotateMember}
                onClose={() => setAnnotateMember(null)}
                onSaved={(id, adminTags, adminNote) => setData(rows => rows.map(r => (r._id === id ? { ...r, adminTags, adminNote } : r)))}
            />
            <MemberDeleteDialog
                member={deleteMember}
                onClose={() => setDeleteMember(null)}
                onDeleted={id => setData(rows => rows.map(r => (r._id === id ? { ...r, status: 'deleted' } : r)))}
            />
        </>
    )
}

export default MembersView
