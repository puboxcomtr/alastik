'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import classnames from 'classnames'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'

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

type OrderType = {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    isGuest: boolean
    status: string
    statusText: string
    paymentMethod: string
    paymentMethodText: string
    paymentStatus: string
    paymentStatusText: string
    total: number
    currency: string
    itemCount: number
    createdAt: string
}

type OrderWithActionsType = OrderType & {
    actions?: string
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value)
    addMeta({ itemRank })
    return itemRank.passed
}

// Ödeme durumu rengi (sadece pending/failed için)
const getPaymentStatusColor = (status: string): 'default' | 'error' | 'warning' => {
    if (status === 'failed') return 'error'
    if (status === 'pending') return 'warning'
    return 'default'
}

// Ödeme durumu etiketi
const getPaymentStatusLabel = (status: string): string => {
    if (status === 'failed') return 'Başarısız'
    if (status === 'pending') return 'Bekliyor'
    return status
}

// Fiyat formatla
const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price) + ' TL'
}

// Tarih formatla
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const columnHelper = createColumnHelper<OrderWithActionsType>()

const DraftOrderListTable = () => {
    const router = useRouter()
    const { lang: locale } = useParams()
    const [data, setData] = useState<OrderType[]>([])
    const [loading, setLoading] = useState(true)

    // Pagination state
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [totalCount, setTotalCount] = useState(0)

    const loadOrders = async (currentPage: number, currentLimit: number) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', String(currentPage))
            params.set('limit', String(currentLimit))
            // Taslak siparişler: ödemesi başarısız veya bekleyen
            params.set('paymentStatus', 'failed,pending')

            const url = `${API_ENDPOINTS.orders.list()}?${params.toString()}`

            const response = await fetchAPI(url, { cache: 'no-store' })

            const orders = (response.data || []).map((order: any) => ({
                id: order.id || order._id,
                orderNumber: order.orderNumber || '',
                customerName: order.customerName || '',
                customerEmail: order.customerEmail || '',
                isGuest: order.isGuest || false,
                status: order.status || 'pending',
                statusText: order.statusText || '',
                paymentMethod: order.paymentMethod || '',
                paymentMethodText: order.paymentMethodText || '',
                paymentStatus: order.paymentStatus || 'pending',
                paymentStatusText: order.paymentStatusText || '',
                total: order.total || 0,
                currency: order.currency || 'TRY',
                itemCount: order.itemCount || 0,
                createdAt: order.createdAt || ''
            }))

            setData(orders)
            setTotalCount(response.pagination?.total || orders.length)
        } catch (error) {
            console.error('Draft orders fetch error:', error)
            toast.error('Taslak siparişler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders(page, limit)
    }, [page, limit])

    const columns = useMemo<ColumnDef<OrderWithActionsType, any>[]>(
        () => [
            columnHelper.accessor('orderNumber', {
                header: 'Sipariş No',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <Typography variant='body2' fontWeight='bold'>
                            {formatDate(row.original.createdAt)}
                        </Typography>
                        <Typography variant='body2'>
                            {row.original.orderNumber}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('customerName', {
                header: 'Müşteri',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <div className='flex items-center gap-2'>
                            <Typography className='font-medium' color='text.primary'>
                                {row.original.customerName}
                            </Typography>
                            {row.original.isGuest && (
                                <Chip
                                    label='Misafir'
                                    size='small'
                                    variant='outlined'
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            )}
                        </div>
                        <Typography variant='caption' color='text.secondary'>
                            {row.original.customerEmail}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('paymentStatus', {
                header: 'Ödeme Durumu',
                cell: ({ row }) => (
                    <Chip
                        label={getPaymentStatusLabel(row.original.paymentStatus)}
                        color={getPaymentStatusColor(row.original.paymentStatus)}
                        size='small'
                        variant='tonal'
                    />
                )
            }),
            columnHelper.accessor('total', {
                header: 'Toplam',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <div className='flex items-center gap-2'>
                            <Typography className='font-medium' color='text.primary'>
                                {formatPrice(row.original.total)}
                            </Typography>
                        </div>
                        <Typography variant='caption' color='text.secondary'>
                            {row.original.paymentMethodText}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('actions', {
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center' onClick={(e) => e.stopPropagation()}>
                        <Tooltip title='Siparişi Görüntüle'>
                            <IconButton
                                size='small'
                                onClick={() => router.push(`/${locale}/apps/order/detail/${row.original.id}`)}
                            >
                                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
                enableSorting: false
            })
        ],
        [locale, router]
    )

    const table = useReactTable({
        data,
        columns,
        filterFns: { fuzzy: fuzzyFilter },
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues()
    })

    return (
        <Card>
            <CardHeader title='Taslak Siparişler' className='pbe-4' />
            <Divider />
            <div className='p-5'>
                <Typography variant='body2' color='text.secondary'>
                    Toplam <strong>{totalCount} Taslak Sipariş</strong> bulundu
                </Typography>
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
                            <Typography>Taslak siparişler yükleniyor...</Typography>
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
                        {data.length === 0 && !loading ? (
                            <tbody>
                                <tr>
                                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center py-4'>
                                        <Typography variant='body1' color='text.secondary'>
                                            Taslak sipariş bulunamadı
                                        </Typography>
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr
                                        key={row.id}
                                        className='cursor-pointer'
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => router.push(`/${locale}/apps/order/detail/${row.original.id}`)}
                                    >
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
                rowsPerPageOptions={[10, 20, 50, 100]}
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
                labelRowsPerPage='Sayfa başına:'
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
        </Card>
    )
}

export default DraftOrderListTable