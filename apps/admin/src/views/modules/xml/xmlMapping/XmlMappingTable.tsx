'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { toast } from 'react-toastify'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'

import classnames from 'classnames'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'

import tableStyles from '@core/styles/table.module.css'

type XmlMappingProduct = {
    id: string
    source: string
    sourceName: string
    sourceProductId: string
    stokKodu: string
    hedefStokKodu: string | null
    urunAdi: string
    marka: string
    kategori: string
    hamFiyat: string
    stokAdeti: string
    uretimYili: string
    eslesmeDurumu: 'eslesti' | 'eslestirilmedi'
}

type SourceOption = { code: string; name: string }

const columnHelper = createColumnHelper<XmlMappingProduct>()

const XmlMappingTable = () => {

    const router = useRouter()
    const searchParams = useSearchParams()

    const [data, setData] = useState<XmlMappingProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [sorting, setSorting] = useState<SortingState>([])
    const [sources, setSources] = useState<SourceOption[]>([])

    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    const [excelMenuAnchor, setExcelMenuAnchor] = useState<null | HTMLElement>(null)

    const [searchSource, setSearchSource] = useState(searchParams.get('search') || '')
    const [searchSourceInput, setSearchSourceInput] = useState(searchParams.get('search') || '')
    const [searchHedef, setSearchHedef] = useState(searchParams.get('hedef') || '')
    const [searchHedefInput, setSearchHedefInput] = useState(searchParams.get('hedef') || '')
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const [filterSource, setFilterSource] = useState(searchParams.get('source') || '')
    const [filterDurum, setFilterDurum] = useState(searchParams.get('durum') || '')

    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit)
            })
            if (searchSource) params.append('search', searchSource)
            if (searchHedef) params.append('hedef', searchHedef)
            if (filterSource) params.append('source', filterSource)
            if (filterDurum) params.append('status', filterDurum)

            const res = await fetchAPI(`${API_ENDPOINTS.webxml.allProducts()}?${params.toString()}`, {
                cache: 'no-store'
            })

            if (res.success) {
                setData(res.data || [])
                setTotalCount(res.meta?.total || 0)
                if (res.meta?.sources) setSources(res.meta.sources)
            } else {
                toast.error(res.message || 'Veriler yüklenemedi')
            }
        } catch {
            toast.error('Ürünler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }, [page, limit, searchSource, searchHedef, filterSource, filterDurum])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])
    const handleExport = async () => {
        setExporting(true)
        try {
            const { getSession } = await import('next-auth/react')
            const session = await getSession()
            const token = (session as any)?.user?.accessToken

            const url = API_ENDPOINTS.webxml.mappingExport(filterSource || undefined)
            const res = await fetch(url, {
                headers: { ...(token && { Authorization: `Bearer ${token}` }) }
            })
            if (!res.ok) throw new Error('Dışarı aktarım başarısız')

            const blob = await res.blob()
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'xml-eslesme.xlsx'
            link.click()
            toast.success('Excel indirildi')
        } catch {
            toast.error('Dışarı aktarım sırasında hata oluştu')
        } finally {
            setExporting(false)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImporting(true)
        try {
            const { getSession } = await import('next-auth/react')
            const session = await getSession()
            const token = (session as any)?.user?.accessToken

            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch(API_ENDPOINTS.webxml.mappingImport(), {
                method: 'POST',
                headers: { ...(token && { Authorization: `Bearer ${token}` }) },
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message)
                fetchProducts()
            } else {
                toast.error(data.message || 'İçeri aktarım başarısız')
            }
        } catch {
            toast.error('İçeri aktarım sırasında hata oluştu')
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }
    const handleEslesmeyiKaldir = async (id: string) => {
        try {
            const { getSession } = await import('next-auth/react')
            const session = await getSession()
            const token = (session as any)?.user?.accessToken

            const res = await fetch(API_ENDPOINTS.webxml.mappingDelete(id), {
                method: 'DELETE',
                headers: { ...(token && { Authorization: `Bearer ${token}` }) }
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message)
                fetchProducts()
            } else {
                toast.error(data.message || 'Eşleşme kaldırılamadı')
            }
        } catch {
            toast.error('Eşleşme kaldırılırken hata oluştu')
        }
    }
    const updateUrl = (params: Record<string, string>) => {
        const current = new URLSearchParams(window.location.search)
        Object.entries(params).forEach(([key, val]) => {
            if (val) current.set(key, val)
            else current.delete(key)
        })
        router.replace(`?${current.toString()}`, { scroll: false })
    }

    const handleSearchChange = (field: 'source' | 'hedef', value: string) => {
        if (field === 'source') setSearchSourceInput(value)
        else setSearchHedefInput(value)
        if (searchTimeout) clearTimeout(searchTimeout)
        const t = setTimeout(() => {
            if (field === 'source') { setSearchSource(value); setPage(1); updateUrl({ search: value }) }
            else { setSearchHedef(value); setPage(1); updateUrl({ hedef: value }) }
        }, 500)
        setSearchTimeout(t)
    }

    const eslesmeSayisi = data.filter(d => d.eslesmeDurumu === 'eslesti').length

    const columns = useMemo<ColumnDef<XmlMappingProduct, any>[]>(
        () => [
            columnHelper.accessor('sourceName', {
                header: 'Kaynak',
                cell: ({ row }) => (
                    <Chip label={row.original.sourceName} size='small' variant='outlined' color='info' />
                )
            }),
            columnHelper.accessor('urunAdi', {
                header: 'Ürün',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <Typography variant='body2' fontWeight='bold'>
                            {row.original.stokKodu}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' style={{
                            maxWidth: 260,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {row.original.urunAdi}
                        </Typography>
                    </div>
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
                    <Typography variant='body2'>{row.original.kategori || '-'}</Typography>
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
                    <Typography variant='body2'>{row.original.uretimYili || '-'}</Typography>
                )
            }),
            columnHelper.accessor('hedefStokKodu', {
                header: 'Hedef Stok Kodu',
                cell: ({ row }) => (
                    <Typography variant='body2' color={row.original.hedefStokKodu ? 'success.main' : 'text.disabled'} fontFamily='monospace' fontSize={12}>
                        {row.original.hedefStokKodu || '-'}
                    </Typography>
                )
            }),
            columnHelper.accessor('eslesmeDurumu', {
                header: 'Durum',
                cell: ({ row }) => (
                    <div className='flex items-center' style={{ gap: 6 }}>
                        <Chip
                            label={row.original.eslesmeDurumu === 'eslesti' ? 'Eşleşti' : 'Eşleştirilmedi'}
                            color={row.original.eslesmeDurumu === 'eslesti' ? 'success' : 'default'}
                            size='small'
                            variant={row.original.eslesmeDurumu === 'eslesti' ? 'filled' : 'outlined'}
                        />
                        {row.original.eslesmeDurumu === 'eslesti' && (
                            <Tooltip title='Eşleşmeyi Kaldır'>
                                <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleEslesmeyiKaldir(row.original.id)}
                                >
                                    <i className='ri-close-circle-line text-[18px]' />
                                </IconButton>
                            </Tooltip>
                        )}
                    </div>
                )
            })
        ],
        []
    )

    const table = useReactTable({
        data,
        columns,
        filterFns: {},
        state: { sorting },
        manualPagination: true,
        pageCount: Math.ceil(totalCount / limit),
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
                        <IconButton
                            color='warning'
                            sx={{ borderRadius: 1, gap: 1, px: 2 }}
                            onClick={() => router.push(window.location.pathname.replace('/mapping', '/pricing'))}
                        >
                            <i className='ri-price-tag-3-line text-[22px]' />
                            <Typography variant='body2' fontWeight={500}>Fiyatlandırma Kuralları</Typography>
                        </IconButton>
                        <>
                            <IconButton
                                color='success'
                                sx={{ borderRadius: 1, gap: 1, px: 2 }}
                                onClick={(e) => setExcelMenuAnchor(e.currentTarget)}
                                disabled={exporting || importing}
                            >
                                {(exporting || importing) ? <CircularProgress size={20} /> : <i className='ri-file-excel-2-line text-[22px]' />}
                                <Typography variant='body2' fontWeight={500}>Excel İşlemleri</Typography>
                                <i className='ri-arrow-down-s-line text-[18px]' />
                            </IconButton>
                            <Menu anchorEl={excelMenuAnchor} open={Boolean(excelMenuAnchor)} onClose={() => setExcelMenuAnchor(null)}>
                                <MenuItem onClick={() => { setExcelMenuAnchor(null); handleExport() }}>
                                    <i className='ri-download-2-line text-[18px] mr-2' /> Dışarı Aktar
                                </MenuItem>
                                <MenuItem onClick={() => { setExcelMenuAnchor(null); fileInputRef.current?.click() }}>
                                    <i className='ri-upload-2-line text-[18px] mr-2' /> İçeri Aktar
                                </MenuItem>
                            </Menu>
                            <input ref={fileInputRef} type='file' accept='.xlsx' style={{ display: 'none' }} onChange={handleImport} />
                        </>
                    </div>
                }
            />
            <Divider />

            <Box sx={{ display: 'flex', gap: 2, p: 3, flexWrap: 'wrap' }}>
                <TextField
                    size='small'
                    placeholder='XML stok kodu ara...'
                    value={searchSourceInput}
                    onChange={(e) => handleSearchChange('source', e.target.value)}
                    sx={{ minWidth: 200 }}
                    InputProps={{ startAdornment: <i className='ri-barcode-line text-[16px] mr-1 text-gray-400' /> }}
                />
                <TextField
                    size='small'
                    placeholder='Hedef stok kodu ara...'
                    value={searchHedefInput}
                    onChange={(e) => handleSearchChange('hedef', e.target.value)}
                    sx={{ minWidth: 200 }}
                    InputProps={{ startAdornment: <i className='ri-focus-3-line text-[16px] mr-1 text-gray-400' /> }}
                />
                <TextField
                    select
                    size='small'
                    label='Kaynak'
                    value={filterSource}
                    onChange={(e) => { setFilterSource(e.target.value); setPage(1); updateUrl({ source: e.target.value }) }}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value=''>Tümü</MenuItem>
                    {sources.map(s => (
                        <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    size='small'
                    label='Eşleşme Durumu'
                    value={filterDurum}
                    onChange={(e) => { setFilterDurum(e.target.value); setPage(1); updateUrl({ durum: e.target.value }) }}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value=''>Tümü</MenuItem>
                    <MenuItem value='eslesti'>Eşleşti</MenuItem>
                    <MenuItem value='eslestirilmedi'>Eşleştirilmedi</MenuItem>
                </TextField>
            </Box>

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
                                    <td colSpan={columns.length} className='text-center py-4'>
                                        <Typography variant='body1' color='text.secondary'>
                                            {searchSource || searchHedef || filterSource || filterDurum ? 'Filtreye uygun ürün bulunamadı' : 'Ürün bulunamadı'}
                                        </Typography>
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
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
                labelRowsPerPage='Sayfa başına:'
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
        </Card>
    )
}

export default XmlMappingTable