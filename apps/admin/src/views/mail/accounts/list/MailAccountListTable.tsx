'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

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
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type MailAccountType = {
    id: string
    email: string
    isActive: boolean
}

const columnHelper = createColumnHelper<MailAccountType>()

const MailAccountListTable = () => {
    const [data, setData] = useState<MailAccountType[]>([])
    const [loading, setLoading] = useState(true)

    // Pagination state
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    // Hooks
    const { lang: locale } = useParams()

    useEffect(() => {
        const fetchAccounts = async () => {
            setLoading(true)

            try {
                const params = new URLSearchParams()

                params.set('page', String(page))
                params.set('limit', String(limit))

                const response = await fetchAPI(
                    `${API_ENDPOINTS.mailAccounts.list()}?${params.toString()}`,
                    { cache: 'no-store' }
                )

                const accounts = (response.data || []).map((item: any) => ({
                    id: item.id,
                    email: item.email,
                    isActive: item.isActive
                }))

                setData(accounts)
                setTotalCount(response.meta?.total || 0)
            } catch (error) {
                console.error('Mail accounts fetch error:', error)
                toast.error('Mail hesapları yüklenirken hata oluştu')
            } finally {
                setLoading(false)
            }
        }

        fetchAccounts()
    }, [page, limit])

    const columns = useMemo<ColumnDef<MailAccountType, any>[]>(
        () => [
            columnHelper.accessor('id', {
                header: 'ID',
                cell: ({ row }) => (
                    <Typography variant='body2' fontWeight='bold'>
                        {row.original.id}
                    </Typography>
                )
            }),
            columnHelper.accessor('email', {
                header: 'Email Hesabı',
                cell: ({ row }) => (
                    <Typography variant='body2'>{row.original.email}</Typography>
                )
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => (
                    <Chip
                        size='small'
                        label={row.original.isActive ? 'Aktif' : 'Pasif'}
                        color={row.original.isActive ? 'success' : 'default'}
                        variant='tonal'
                    />
                )
            }),
            {
                id: 'actions',
                header: 'İşlemler',
                cell: ({ row }) => (
                    <Tooltip title='Düzenle'>
                        <Link href={`/${locale}/apps/mail/accounts/edit/${row.original.id}`}>
                            <IconButton size='small'>
                                <i className='ri-edit-box-line'></i>
                            </IconButton>
                        </Link>
                    </Tooltip>
                ),
                enableSorting: false
            }
        ],
        [locale]
    )

    const table = useReactTable({
        data,
        columns,
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel()
    })

    return (
        <Card>
            <CardHeader
                title='Mail Hesapları'
                action={
                    <Button
                        color='primary'
                        variant='contained'
                        component={Link}
                        href={`/${locale}/apps/mail/accounts/add`}
                    >
                        Yeni Mail Hesabı
                    </Button>
                }
            />
            <Divider />
            <div style={{ position: 'relative' }}>
                {loading && (
                    <div
                        style={{
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
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CircularProgress size={24} />
                            <Typography>Mail hesapları yükleniyor...</Typography>
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
                                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                        Mail hesabı bulunamadı
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
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
    )
}

export default MailAccountListTable