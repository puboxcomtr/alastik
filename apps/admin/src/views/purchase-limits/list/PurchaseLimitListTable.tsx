'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import TablePagination from '@mui/material/TablePagination'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import { toast } from 'react-toastify'
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

import { API_ENDPOINTS, fetchAPI } from '@/libs/api'
import tableStyles from '@core/styles/table.module.css'

type PurchaseLimitItem = {
    _id: string
    name: string
    minLimit: number | null
    maxLimit: number | null
    limitType: 'product' | 'category' | 'brand'
    targets: { targetId: string; targetName: string }[]
    memberGroups: string[]
    priority: number
    isActive: boolean
    createdAt: string
}

const limitTypeLabels: Record<string, string> = {
    product: 'Ürün',
    category: 'Kategori',
    brand: 'Marka'
}

const memberGroupLabels: Record<string, string> = {
    member: 'Bireysel Üye',
    dealer: 'Bayi',
    guest: 'Misafir'
}

const columnHelper = createColumnHelper<PurchaseLimitItem>()

const PurchaseLimitListTable = () => {
    const { lang: locale } = useParams()
    const router = useRouter()

    const [data, setData] = useState<PurchaseLimitItem[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [limit, setLimitSize] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    const [search, setSearch] = useState('')
    const [limitType, setLimitType] = useState('')
    const [memberGroup, setMemberGroup] = useState('')
    const [isActive, setIsActive] = useState('')

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<PurchaseLimitItem | null>(null)

    const fetchList = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', String(page))
            params.set('limit', String(limit))
            if (search) params.set('search', search)
            if (limitType) params.set('limitType', limitType)
            if (memberGroup) params.set('memberGroup', memberGroup)
            if (isActive !== '') params.set('isActive', isActive)

            const response = await fetchAPI(`${API_ENDPOINTS.purchaseLimits.list()}?${params.toString()}`, {
                cache: 'no-store'
            })

            setData(response.data || [])
            setTotalCount(response.meta?.total || 0)
        } catch (error: any) {
            console.error('PurchaseLimit list error:', error)
            toast.error('Liste yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, limitType, memberGroup, isActive])

    const handleSearch = () => {
        setPage(1)
        fetchList()
    }

    const handleToggle = async (id: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.purchaseLimits.toggle(id), { method: 'PATCH' })
            toast.success('Durum güncellendi')
            fetchList()
        } catch {
            toast.error('Durum güncellenemedi')
        }
    }

    const handleDeleteClick = (item: PurchaseLimitItem) => {
        setItemToDelete(item)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        try {
            await fetchAPI(API_ENDPOINTS.purchaseLimits.delete(itemToDelete._id), { method: 'DELETE' })
            toast.success(`"${itemToDelete.name}" limiti silindi`)
            setDeleteConfirmOpen(false)
            setItemToDelete(null)
            fetchList()
        } catch {
            toast.error('Silme başarısız')
        }
    }

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false)
        setItemToDelete(null)
    }

    const columns = useMemo<ColumnDef<PurchaseLimitItem, any>[]>(
        () => [
            columnHelper.accessor('name', {
                header: 'Limit Adı',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <Typography variant='body2' fontWeight='bold'>
                            {row.original.name}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('targets', {
                header: 'Adet',
                cell: ({ row }) => (
                    <Typography variant='body2'>{row.original.targets?.length || 0} adet</Typography>
                )
            }),
            {
                id: 'limits',
                header: 'Min / Maks',
                cell: ({ row }: any) => (
                    <Typography>
                        {row.original.minLimit ?? '-'} / {row.original.maxLimit ?? '-'}
                    </Typography>
                )
            },
            columnHelper.accessor('memberGroups', {
                header: 'Üye Grubu',
                cell: ({ row }) => (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(row.original.memberGroups || []).map(g => (
                            <Chip key={g} label={memberGroupLabels[g] || g} variant='tonal' />
                        ))}
                    </Box>
                )
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => (
                    <Switch
                        checked={row.original.isActive}
                        onChange={() => handleToggle(row.original._id)}
                    />
                )
            }),
            {
                id: 'actions',
                header: 'İşlemler',
                cell: ({ row }: any) => (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title='Düzenle'>
                            <Link href={`/${locale}/apps/purchase-limits/edit/${row.original._id}`}>
                                <IconButton size='small'>
                                    <i className='ri-edit-box-line' />
                                </IconButton>
                            </Link>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleDeleteClick(row.original)}
                            >
                                <i className='ri-delete-bin-line' />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )
            }
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [locale]
    )

    const table = useReactTable({
        data,
        columns,
        filterFns: {} as any,
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
                title='Satın Alma Limitleri'
                action={
                    <Button
                        variant='contained'
                        component={Link}
                        href={`/${locale}/apps/purchase-limits/add`}
                        startIcon={<i className='ri-add-line' />}
                    >
                        Yeni Limit
                    </Button>
                }
            />
            <Divider />

            <Box sx={{ p: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size='small'
                    label='Ara'
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    sx={{ minWidth: 220 }}
                />
                <TextField
                    select
                    size='small'
                    label='Tür'
                    value={limitType}
                    onChange={e => {
                        setLimitType(e.target.value)
                        setPage(1)
                    }}
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value=''>Tümü</MenuItem>
                    <MenuItem value='product'>Ürün</MenuItem>
                    <MenuItem value='category'>Kategori</MenuItem>
                    <MenuItem value='brand'>Marka</MenuItem>
                </TextField>
                <TextField
                    select
                    size='small'
                    label='Üye Grubu'
                    value={memberGroup}
                    onChange={e => {
                        setMemberGroup(e.target.value)
                        setPage(1)
                    }}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value=''>Tümü</MenuItem>
                    <MenuItem value='member'>Bireysel Üye</MenuItem>
                    <MenuItem value='dealer'>Bayi</MenuItem>
                    <MenuItem value='guest'>Misafir</MenuItem>
                </TextField>
                <TextField
                    select
                    size='small'
                    label='Durum'
                    value={isActive}
                    onChange={e => {
                        setIsActive(e.target.value)
                        setPage(1)
                    }}
                    sx={{ minWidth: 140 }}
                >
                    <MenuItem value=''>Tümü</MenuItem>
                    <MenuItem value='true'>Aktif</MenuItem>
                    <MenuItem value='false'>Pasif</MenuItem>
                </TextField>
                <Button variant='outlined' onClick={handleSearch}>
                    Ara
                </Button>
            </Box>

            <Divider />

            <div style={{ position: 'relative' }}>
                {loading && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            minHeight: '200px'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={24} />
                            <Typography>Yükleniyor...</Typography>
                        </Box>
                    </div>
                )}

                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        {table.getRowModel().rows.length === 0 && !loading ? (
                            <tbody>
                                <tr>
                                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                        Limit bulunamadı
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
                onPageChange={(_, newPage) => setPage(newPage + 1)}
                onRowsPerPageChange={e => {
                    setLimitSize(Number(e.target.value))
                    setPage(1)
                }}
            />
            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Satın Alma Limitini Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{itemToDelete?.name}"</strong> limitini silmek istediğinizden emin misiniz?
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
        </Card>
    )
}

export default PurchaseLimitListTable