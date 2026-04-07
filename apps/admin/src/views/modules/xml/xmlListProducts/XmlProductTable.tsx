'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

import type { XmlProductType } from '@/types/apps/xmlProductTypes'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'

import classnames from 'classnames'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'

import XmlProductFilters from './XmlProductFilter'
import tableStyles from '@core/styles/table.module.css'

const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
    pending: { label: 'Bekliyor', color: 'warning' },
    synced_to_dia: { label: 'Eşleştirildi', color: 'success' },
    filtered_out: { label: 'Filtre Dışı', color: 'default' },
    error: { label: 'Hata', color: 'error' },
    mapped: { label: 'Eşlendi', color: 'info' }
}

const seasonMap: Record<string, string> = {
    '0': '-',
    '1': 'Yaz',
    '2': 'Kış',
    '3': '4 Mevsim'
}

const columnHelper = createColumnHelper<XmlProductType>()

const XmlProductListTable = () => {
    const [data, setData] = useState<XmlProductType[]>([])
    const [loading, setLoading] = useState(true)
    const [rowSelection, setRowSelection] = useState({})
    const [sorting, setSorting] = useState<SortingState>([])

    // Pagination
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    // Filtreler
    const [filters, setFilters] = useState({ search: '', status: '', brand: '', season: '' })
    const [brands, setBrands] = useState<string[]>([])

    // Meta istatistikler
    const [stats, setStats] = useState({ total: 0, diaAktarilan: 0, filtered: 0, pending: 0, error: 0 })

    const { lang: locale } = useParams()
    const router = useRouter()

    // URL'den source parametresini al
    const [source, setSource] = useState('')

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        setSource(urlParams.get('source') || '')
    }, [])

    // Debounce için search
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

    const fetchProducts = useCallback(async () => {
        if (!source) return
        setLoading(true)

        try {
            const params = new URLSearchParams({
                source,
                page: String(page),
                limit: String(limit)
            })

            if (filters.search) params.append('search', filters.search)
            if (filters.status) params.append('status', filters.status)
            if (filters.brand) params.append('brand', filters.brand)
            if (filters.season) params.append('season', filters.season)

            const res = await fetchAPI(
                `${API_ENDPOINTS.webxml.xmlProducts(source).split('?')[0]}?${params.toString()}`,
                { cache: 'no-store' }
            )

            if (res.success) {
                setData(res.data || [])
                setTotalCount(res.meta?.total || 0)
                if (res.meta?.brands) setBrands(res.meta.brands)
                if (res.meta?.stats) setStats(res.meta.stats)
            }
        } catch (err) {
            console.error('XML ürünler çekilemedi:', err)
        } finally {
            setLoading(false)
        }
    }, [source, page, limit, filters])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const handleFilterChange = (key: string, value: string) => {
        if (key === 'search') {
            if (searchTimeout) clearTimeout(searchTimeout)
            const timeout = setTimeout(() => {
                setFilters(prev => ({ ...prev, search: value }))
                setPage(1)
            }, 500)
            setSearchTimeout(timeout)
        } else {
            setFilters(prev => ({ ...prev, [key]: value }))
            setPage(1)
        }
    }

    const columns = useMemo<ColumnDef<XmlProductType, any>[]>(
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
                    <Checkbox
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                ),
                size: 44
            },
            columnHelper.accessor('urunAdi', {
                header: 'Ürün',
                cell: ({ row }) => (
                    <div className='flex items-center' style={{ gap: 8 }}>
                        {row.original.gorselUrl ? (
                            <img
                                src={row.original.gorselUrl}
                                width={40}
                                height={40}
                                className='rounded bg-actionHover'
                                style={{ objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        ) : (
                            <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className='ri-image-line' style={{ color: '#ccc' }} />
                            </div>
                        )}
                        <div className='flex flex-col'>
                            <Typography variant='body2' fontWeight='bold'>
                                {row.original.stokKodu}
                            </Typography>
                            <Typography variant='body2' color='text.secondary' style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.original.urunAdi}
                            </Typography>
                        </div>
                    </div >
                )
            }),
            columnHelper.accessor('marka', {
                header: 'Marka',
                cell: ({ row }) => (
                    <Typography variant='body2'>{row.original.marka}</Typography>
                )
            }),
            columnHelper.accessor('kategori', {
                header: 'Kategori',
                cell: ({ row }) => (
                    <Typography variant='body2'>{row.original.kategori}</Typography>
                )
            }),
            columnHelper.accessor('hamFiyat', {
                header: 'Fiyat',
                cell: ({ row }) => (
                    <Typography variant='body2' fontWeight='bold'>
                        {row.original.hamFiyat || '-'} TL
                    </Typography>
                )
            }),
            columnHelper.accessor('stokAdeti', {
                header: 'Stok',
                cell: ({ row }) => (
                    <Typography variant='body2'>{row.original.stokAdeti}</Typography>
                )
            }),
            columnHelper.accessor('uretimYili', {
                header: 'Yıl',
                cell: ({ row }) => (
                    <Typography variant='body2'>{row.original.uretimYili}</Typography>
                )
            }),
            columnHelper.accessor('status', {
                header: 'Durum',
                cell: ({ row }) => {
                    const s = statusMap[row.original.status] || { label: row.original.status, color: 'default' as const }
                    return (
                        <Tooltip title={row.original.errorMessage || ''}>
                            <Chip label={s.label} color={s.color} size='small' variant='tonal' />
                        </Tooltip>
                    )
                }
            })
        ],
        [source]
    )

    const table = useReactTable({
        data,
        columns,
        filterFns: {},
        state: { rowSelection, sorting },
        manualPagination: true,
        pageCount: Math.ceil(totalCount / limit),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel()
    })

    return (
        <Card>
            <CardHeader
                title='XML Ürün Listesi'
                action={
                    <div className='flex items-center' style={{ gap: 8 }}>
                        <Chip label={`Toplam: ${stats.total}`} size='small' variant='tonal' />
                        <Chip label={`Eşleştirilen: ${stats.diaAktarilan}`} color='success' size='small' variant='tonal' />
                        <Chip label={`Filtre Dışı: ${stats.filtered}`} color='warning' size='small' variant='tonal' />
                        <Chip label={`Bekliyor: ${stats.pending}`} color='info' size='small' variant='tonal' />
                        <Chip label={`Hata: ${stats.error}`} color='error' size='small' variant='tonal' />
                    </div>
                }
            />
            <XmlProductFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                brands={brands}
            />
            <Divider />

            <div style={{ position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10, minHeight: 200
                    }}>
                        <div className='flex items-center' style={{ gap: 10 }}>
                            <CircularProgress size={24} />
                            <Typography>Yükleniyor...</Typography>
                        </div>
                    </div>
                )}

                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            {table.getHeaderGroups().map(hg => (
                                <tr key={hg.id}>
                                    {hg.headers.map(header => (
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
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className='text-center'>
                                        Ürün bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
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
                onPageChange={(_, p) => setPage(p + 1)}
                onRowsPerPageChange={e => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                }}
            />
        </Card>
    )
}

export default XmlProductListTable