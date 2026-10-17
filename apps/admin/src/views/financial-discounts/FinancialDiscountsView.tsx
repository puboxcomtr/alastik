'use client'

// Finansal İskontolar: cari tipi (Premium / Normal) × ürün kategorileri (ana + alt) × markalar × üretim yılı × ödeme yöntemi → iskonto oranı.
// Liste düzeni ürün listesiyle aynıdır (Filtreler + arama çubuğu, tablo, sayfalama; sayfa adreste ?page=N).

// React Imports
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

// Next Imports
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
// eslint-disable-next-line import/no-duplicates
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { toast } from 'react-toastify'

// Component Imports
import ConfirmDialog from '@components/dialogs/ConfirmDialog'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import tableStyles from '@core/styles/table.module.css'

type Option = { id: string; title: string }

// Ana kategori ve alt kategorileri (seçenek ağacı)
type CategoryOption = { name: string; subCategories: string[] }

// Alt kategori seçimi: hangi ana kategoriye ait olduğuyla birlikte tutulur
type SubCategory = { main: string; name: string }

type DiscountRow = {
    _id: string
    name: string
    customerTier: string
    paymentMethod: string
    categories: string[]
    subCategories: SubCategory[]
    brands: string[]
    productionYear: string
    productionYearAndOlder?: boolean
    stockSource: string
    rate: number
    isActive: boolean
}

type Filters = { customerTier: string; paymentMethod: string; stockSource: string; category: string; brand: string; productionYear: string; status: string }

type FormState = { name: string; customerTier: string; paymentMethod: string; categories: string[]; subCategories: SubCategory[]; brands: string[]; productionYear: string; productionYearAndOlder: boolean; stockSource: string; rate: string; isActive: boolean }

const EMPTY_FILTERS: Filters = { customerTier: '', paymentMethod: '', stockSource: '', category: '', brand: '', productionYear: '', status: '' }
const EMPTY_FORM: FormState = { name: '', customerTier: '', paymentMethod: '', categories: [], subCategories: [], brands: [], productionYear: '', productionYearAndOlder: false, stockSource: '', rate: '', isActive: true }

// Listede bir hücrede en fazla kaç öğe yazılır (fazlası "+N" olarak gösterilir)
const MAX_LISTED_ITEMS = 3
// Seçim kutusunda en fazla kaç etiket görünür
const MAX_VISIBLE_TAGS = 3
const PREMIUM_TIER = 'premium'
const DEFAULT_LIMIT = 50

const columnHelper = createColumnHelper<DiscountRow & { actions?: string }>()

const formatRate = (rate: number) => `%${Number(rate).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`

/** Uzun listeyi kısaltır: ilk birkaç öğe + "+N" */
const summarize = (items: string[]) =>
    items.length > MAX_LISTED_ITEMS ? `${items.slice(0, MAX_LISTED_ITEMS).join(', ')} +${items.length - MAX_LISTED_ITEMS}` : items.join(', ')

/** Kategori kapsamını satır satır metne çevirir: "Ana Kategori › Alt 1, Alt 2" (alt seçilmemişse yalnız ana kategori) */
const categoryLines = (row: { categories: string[]; subCategories: SubCategory[] }) =>
    (row.categories || []).map(main => {
        const subs = (row.subCategories || []).filter(sub => sub.main === main).map(sub => sub.name)

        return subs.length ? `${main} › ${summarize(subs)}` : main
    })

const FinancialDiscountsView = () => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Sayfa adresten okunur/yazılır (?page=N)
    const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1)

    const setPage = useCallback((next: number) => {
        const query = new URLSearchParams(searchParams.toString())

        query.set('page', String(next))
        router.replace(`${pathname}?${query.toString()}`, { scroll: false })
    }, [searchParams, router, pathname])

    const [limit, setLimit] = useState(DEFAULT_LIMIT)
    const [rows, setRows] = useState<DiscountRow[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [rowSelection, setRowSelection] = useState({})
    // Sütun başlığına tıklayınca sıralama SUNUCUDA yapılır (tüm kayıtlar, yalnız görünen sayfa değil)
    const [sorting, setSorting] = useState<SortingState>([])

    // Seçenekler (API): cari tipleri, ödeme yöntemleri; sitedeki ürünlerden kategori / marka / üretim yılı
    const [customerTiers, setCustomerTiers] = useState<Option[]>([])
    const [paymentMethods, setPaymentMethods] = useState<Option[]>([])
    const [stockSources, setStockSources] = useState<Option[]>([])
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [brands, setBrands] = useState<string[]>([])
    const [productionYears, setProductionYears] = useState<string[]>([])

    // Arama çubuğu + filtre paneli (taslak → Filtrele ile uygulanır)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

    // Ekle / düzenle penceresi
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<DiscountRow | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<DiscountRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    const tierTitle = useCallback((id: string) => customerTiers.find(t => t.id === id)?.title || id, [customerTiers])
    const methodTitle = useCallback((id: string) => paymentMethods.find(m => m.id === id)?.title || id, [paymentMethods])
    const sourceTitle = useCallback((id: string) => stockSources.find(x => x.id === id)?.title || id, [stockSources])

    useEffect(() => {
        fetchAPI(API_ENDPOINTS.financialDiscounts.options(), { cache: 'no-store' })
            .then(res => {
                setCustomerTiers(res?.data?.customerTiers || [])
                setPaymentMethods(res?.data?.paymentMethods || [])
                setStockSources(res?.data?.stockSources || [])
                setCategories(res?.data?.categories || [])
                setBrands(res?.data?.brands || [])
                setProductionYears(res?.data?.productionYears || [])
            })
            .catch(() => toast.error('Seçenekler yüklenemedi'))
    }, [])

    // Art arda gelen isteklerde (hızlı sıralama/filtre) yalnız EN SON isteğin yanıtı ekrana yazılır
    const requestSeq = useRef(0)

    const load = useCallback(async () => {
        const seq = ++requestSeq.current

        setLoading(true)

        try {
            const res = await fetchAPI(
                API_ENDPOINTS.financialDiscounts.list({ ...filters, search, page, limit, sort: sorting[0]?.id, order: sorting[0]?.desc ? 'desc' : 'asc' }),
                { cache: 'no-store' }
            )

            if (seq !== requestSeq.current) return
            setRows(res?.data || [])
            setTotalCount(res?.meta?.total || 0)
        } catch (error: any) {
            if (seq === requestSeq.current) toast.error(error?.message || 'Finansal iskontolar yüklenemedi')
        } finally {
            if (seq === requestSeq.current) setLoading(false)
        }
    }, [filters, search, page, limit, sorting])

    useEffect(() => {
        load()
    }, [load])

    const applySearch = () => {
        setSearch(searchInput.trim())
        if (page !== 1) setPage(1)
    }

    const applyFilters = () => {
        setFilters(draft)
        setSearch(searchInput.trim())
        setFiltersOpen(false)
        if (page !== 1) setPage(1)
    }

    const resetFilters = () => {
        setDraft(EMPTY_FILTERS)
        setFilters(EMPTY_FILTERS)
        setSearchInput('')
        setSearch('')
        setFiltersOpen(false)
        if (page !== 1) setPage(1)
    }

    const updateDraft = (field: keyof Filters) => (e: ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, [field]: e.target.value }))

    const activeFilterCount = Object.values(filters).filter(value => value.trim() !== '').length

    // Alt kategori seçenekleri: yalnız seçili ana kategorilerin altındakiler
    const subCategoryOptions = useMemo<SubCategory[]>(
        () => categories.filter(c => form.categories.includes(c.name)).flatMap(c => c.subCategories.map(name => ({ main: c.name, name }))),
        [categories, form.categories]
    )

    // Ana kategori değişince, kaldırılan ana kategorilerin alt kategorileri de seçimden düşer
    const changeMainCategories = (next: string[]) =>
        setForm(f => ({ ...f, categories: next, subCategories: f.subCategories.filter(sub => next.includes(sub.main)) }))

    const openAdd = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setDialogOpen(true)
    }

    const openEdit = (row: DiscountRow) => {
        setEditing(row)
        setForm({ name: row.name, customerTier: row.customerTier, paymentMethod: row.paymentMethod, categories: row.categories || [], subCategories: row.subCategories || [], brands: row.brands || [], productionYear: row.productionYear || '', productionYearAndOlder: row.productionYearAndOlder === true, stockSource: row.stockSource || '', rate: String(row.rate), isActive: row.isActive })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) return toast.error('İskonto adı zorunludur')
        if (!form.customerTier) return toast.error('Cari tipi seçiniz')
        if (!form.paymentMethod) return toast.error('Ödeme yöntemi seçiniz')
        const rate = Number(String(form.rate).replace(',', '.'))

        if (form.rate === '' || !Number.isFinite(rate) || rate < 0 || rate > 100) return toast.error('İskonto oranı 0 ile 100 arasında olmalıdır')

        setSaving(true)

        try {
            const res = await fetchAPI(editing ? API_ENDPOINTS.financialDiscounts.update(editing._id) : API_ENDPOINTS.financialDiscounts.create(), {
                method: editing ? 'PUT' : 'POST',
                body: JSON.stringify({ ...form, name: form.name.trim(), rate })
            })

            if (res?.success) {
                toast.success(res.message || 'Kaydedildi')
                setDialogOpen(false)
                load()
            } else {
                toast.error(res?.message || 'Kaydedilemedi')
            }
        } catch (error: any) {
            toast.error(error?.message || 'Kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = useCallback(async (row: DiscountRow) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.financialDiscounts.toggleStatus(row._id), { method: 'PATCH' })

            if (res?.success) {
                setRows(prev => prev.map(r => (r._id === row._id ? { ...r, isActive: !row.isActive } : r)))
                toast.success(res.message || 'Durum güncellendi')
            } else {
                toast.error(res?.message || 'Durum güncellenemedi')
            }
        } catch (error: any) {
            toast.error(error?.message || 'Durum güncellenemedi')
        }
    }, [])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.financialDiscounts.delete(deleteTarget._id), { method: 'DELETE' })

            if (res?.success) {
                toast.success(res.message || 'İskonto silindi')
                setDeleteTarget(null)
                load()
            } else {
                toast.error(res?.message || 'İskonto silinemedi')
            }
        } catch (error: any) {
            toast.error(error?.message || 'İskonto silinemedi')
        } finally {
            setDeleting(false)
        }
    }

    const columns = useMemo<ColumnDef<DiscountRow & { actions?: string }, any>[]>(
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
                ),
                enableSorting: false
            },
            columnHelper.accessor('name', {
                header: 'İskonto Adı',
                cell: ({ row }) => {
                    const premium = row.original.customerTier === PREMIUM_TIER

                    return (
                        <div className='flex flex-col items-start gap-1'>
                            <Typography className='font-medium' color='text.primary'>{row.original.name}</Typography>
                            {/* Cari tipi adın altında gösterilir (ayrı sütun yok) */}
                            <Chip
                                size='small'
                                variant='tonal'
                                color={premium ? 'warning' : 'secondary'}
                                icon={premium ? <i className='ri-vip-crown-fill' /> : undefined}
                                label={tierTitle(row.original.customerTier)}
                            />
                        </div>
                    )
                }
            }),
            columnHelper.accessor('stockSource', {
                header: 'Stok Kaynağı',
                cell: ({ row }) => (
                    <Typography color={row.original.stockSource ? 'text.primary' : 'text.secondary'}>
                        {row.original.stockSource ? sourceTitle(row.original.stockSource) : 'Tüm Ürünler'}
                    </Typography>
                )
            }),
            columnHelper.accessor('categories', {
                header: 'Ürün Kategorisi',
                cell: ({ row }) => {
                    const lines = categoryLines(row.original)

                    if (!lines.length) return <Typography color='text.secondary'>Tüm Kategoriler</Typography>

                    return (
                        <div className='flex flex-col'>
                            {lines.slice(0, MAX_LISTED_ITEMS).map(line => <Typography key={line} color='text.primary'>{line}</Typography>)}
                            {lines.length > MAX_LISTED_ITEMS ? <Typography variant='body2' color='text.secondary'>+{lines.length - MAX_LISTED_ITEMS} kategori</Typography> : null}
                        </div>
                    )
                }
            }),
            columnHelper.accessor('brands', {
                header: 'Marka',
                cell: ({ row }) => (
                    <Typography color={row.original.brands?.length ? 'text.primary' : 'text.secondary'}>
                        {row.original.brands?.length ? summarize(row.original.brands) : 'Tüm Markalar'}
                    </Typography>
                )
            }),
            columnHelper.accessor('productionYear', {
                header: 'Üretim Yılı',
                cell: ({ row }) => (
                    <Typography color={row.original.productionYear ? 'text.primary' : 'text.secondary'}>
                        {row.original.productionYear ? `${row.original.productionYear}${row.original.productionYearAndOlder ? ' ve öncesi' : ''}` : 'Tüm Yıllar'}
                    </Typography>
                )
            }),
            columnHelper.accessor('paymentMethod', {
                header: 'Ödeme Yöntemi',
                cell: ({ row }) => <Typography>{methodTitle(row.original.paymentMethod)}</Typography>
            }),
            columnHelper.accessor('rate', {
                header: 'İskonto Oranı',
                cell: ({ row }) => <Typography className='font-medium' color='text.primary'>{formatRate(row.original.rate)}</Typography>
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => <Switch size='small' checked={row.original.isActive} onChange={() => handleToggle(row.original)} />
            }),
            columnHelper.accessor('actions', {
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='Düzenle'>
                            <IconButton size='small' onClick={() => openEdit(row.original)}>
                                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton size='small' onClick={() => setDeleteTarget(row.original)}>
                                <i className='ri-delete-bin-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
                enableSorting: false
            })
        ],
        [tierTitle, methodTitle, sourceTitle, handleToggle]
    )

    const table = useReactTable({
        data: rows,
        columns,
        state: { rowSelection, sorting },
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        manualSorting: true,
        // Her sütunda ilk tıklama artan, ikinci azalan, üçüncü sıralamayı kaldırır
        sortDescFirst: false,
        onSortingChange: setSorting,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel()
    })

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                    <Typography variant='h4'>Finansal İskontolar</Typography>
                    <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={openAdd}>
                        İskonto Ekle
                    </Button>
                </div>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Card>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 4 }}>
                        <Badge badgeContent={activeFilterCount} color='primary'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                startIcon={<i className='ri-filter-3-line' />}
                                endIcon={<i className={filtersOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
                                onClick={() => setFiltersOpen(open => !open)}
                                sx={{ minWidth: 140 }}
                            >
                                Filtreler
                            </Button>
                        </Badge>
                        <TextField
                            size='small'
                            placeholder='İskonto adı ile arama yapabilirsiniz...'
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applySearch() } }}
                            sx={{ flex: 1, minWidth: 280 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <i className='ri-search-line' />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>

                    <Collapse in={filtersOpen} timeout='auto' unmountOnExit>
                        <Divider />
                        <Box sx={{ p: 6 }}>
                            <Grid container spacing={4} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyFilters() } }}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Cari Tipi' value={draft.customerTier} onChange={updateDraft('customerTier')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        {customerTiers.map(option => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Ödeme Yöntemi' value={draft.paymentMethod} onChange={updateDraft('paymentMethod')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        {paymentMethods.map(option => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Stok Kaynağı' value={draft.stockSource} onChange={updateDraft('stockSource')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        {stockSources.map(option => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Autocomplete
                                        size='small'
                                        options={categories.map(c => c.name)}
                                        value={draft.category || null}
                                        onChange={(_, value) => setDraft(d => ({ ...d, category: value || '' }))}
                                        noOptionsText='Sonuç yok'
                                        renderInput={params => <TextField {...params} label='Ürün Kategorisi' placeholder='Tümü' />}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Autocomplete
                                        size='small'
                                        options={brands}
                                        value={draft.brand || null}
                                        onChange={(_, value) => setDraft(d => ({ ...d, brand: value || '' }))}
                                        noOptionsText='Sonuç yok'
                                        renderInput={params => <TextField {...params} label='Marka' placeholder='Tümü' />}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Üretim Yılı' value={draft.productionYear} onChange={updateDraft('productionYear')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        {productionYears.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Durum' value={draft.status} onChange={updateDraft('status')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        <MenuItem value='active'>Aktif</MenuItem>
                                        <MenuItem value='passive'>Pasif</MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                                    <Button variant='outlined' color='secondary' onClick={resetFilters}>
                                        Temizle
                                    </Button>
                                    <Button variant='contained' onClick={applyFilters}>
                                        Filtrele
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>

                    <Divider />
                    <div style={{ position: 'relative' }}>
                        {loading && (
                            <div
                                className='flex items-center justify-center'
                                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 1000, minHeight: '200px' }}
                            >
                                <div className='flex items-center gap-3'>
                                    <CircularProgress size={24} />
                                    <Typography>Finansal iskontolar yükleniyor...</Typography>
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
                                {table.getRowModel().rows.length === 0 ? (
                                    <tbody>
                                        <tr>
                                            <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                                {loading ? '' : 'İskonto Bulunamadı'}
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
                        page={Math.min(page - 1, Math.max(Math.ceil(totalCount / limit) - 1, 0))}
                        onPageChange={(_, newPage) => setPage(newPage + 1)}
                        onRowsPerPageChange={e => {
                            setLimit(Number(e.target.value))
                            setPage(1)
                        }}
                    />
                </Card>
            </Grid>

            {/* Ekle / Düzenle */}
            <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth='md' fullWidth>
                <DialogTitle className='flex items-center justify-between' sx={{ px: 8, pt: 6 }}>
                    <Typography variant='h4' component='span'>{editing ? 'İskontoyu Düzenle' : 'İskonto Ekle'}</Typography>
                    <IconButton size='small' onClick={() => setDialogOpen(false)} disabled={saving}>
                        <i className='ri-close-line text-2xl' />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 8 }}>
                    <Grid container spacing={6} sx={{ pt: 2 }}>
                        <Grid size={{ xs: 12 }}>
                            <TextField fullWidth label='İskonto Adı' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select fullWidth label='Cari Tipi' value={form.customerTier} onChange={e => setForm(f => ({ ...f, customerTier: e.target.value }))}>
                                {customerTiers.map(option => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select fullWidth label='Ödeme Yöntemi' value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                                {paymentMethods.map(option => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                select
                                fullWidth
                                label='Stok Kaynağı'
                                value={form.stockSource}
                                onChange={e => setForm(f => ({ ...f, stockSource: e.target.value }))}
                                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                            >
                                <MenuItem value=''>Tüm Ürünler</MenuItem>
                                {stockSources.map(option => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Autocomplete
                                multiple
                                disableCloseOnSelect
                                limitTags={MAX_VISIBLE_TAGS}
                                options={categories.map(c => c.name)}
                                value={form.categories}
                                onChange={(_, value) => changeMainCategories(value)}
                                noOptionsText='Sonuç yok'
                                renderInput={params => (
                                    <TextField {...params} label='Ana Kategori' placeholder={form.categories.length ? '' : 'Tüm Kategoriler'} slotProps={{ inputLabel: { shrink: true } }} />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Autocomplete
                                multiple
                                disableCloseOnSelect
                                limitTags={MAX_VISIBLE_TAGS}
                                disabled={!subCategoryOptions.length}
                                options={subCategoryOptions}
                                groupBy={option => option.main}
                                getOptionLabel={option => option.name}
                                isOptionEqualToValue={(option, value) => option.main === value.main && option.name === value.name}
                                value={form.subCategories}
                                onChange={(_, value) => setForm(f => ({ ...f, subCategories: value }))}
                                noOptionsText='Sonuç yok'
                                renderInput={params => (
                                    <TextField
                                        {...params}
                                        label='Alt Kategori'
                                        placeholder={form.subCategories.length ? '' : form.categories.length ? 'Tüm Alt Kategoriler' : 'Önce ana kategori seçin'}
                                        slotProps={{ inputLabel: { shrink: true } }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Autocomplete
                                multiple
                                disableCloseOnSelect
                                limitTags={MAX_VISIBLE_TAGS}
                                options={brands}
                                value={form.brands}
                                onChange={(_, value) => setForm(f => ({ ...f, brands: value }))}
                                noOptionsText='Sonuç yok'
                                renderInput={params => (
                                    <TextField {...params} label='Marka' placeholder={form.brands.length ? '' : 'Tüm Markalar'} slotProps={{ inputLabel: { shrink: true } }} />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label='Üretim Yılı'
                                value={form.productionYear}
                                onChange={e => setForm(f => ({ ...f, productionYear: e.target.value, productionYearAndOlder: e.target.value ? f.productionYearAndOlder : false }))}
                                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                            >
                                <MenuItem value=''>Tüm Yıllar</MenuItem>
                                {productionYears.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                            </TextField>
                            <FormControlLabel
                                className='mbs-1'
                                control={
                                    <Checkbox
                                        size='small'
                                        checked={form.productionYearAndOlder}
                                        disabled={!form.productionYear}
                                        onChange={e => setForm(f => ({ ...f, productionYearAndOlder: e.target.checked }))}
                                    />
                                }
                                label='Seçili yıl ve öncesi'
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                type='number'
                                label='İskonto Oranı'
                                value={form.rate}
                                onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                InputProps={{ startAdornment: <InputAdornment position='start'>%</InputAdornment> }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }} className='flex items-center'>
                            <FormControlLabel
                                control={<Switch checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />}
                                label='Aktif'
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 8, pb: 6, gap: 2 }}>
                    <Button size='large' variant='outlined' color='secondary' onClick={() => setDialogOpen(false)} disabled={saving}>Vazgeç</Button>
                    <Button size='large' variant='contained' onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color='inherit' /> : null}>
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                title='İskontoyu Sil'
                message={`"${deleteTarget?.name}" iskontosunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
                confirmText='Evet, Sil'
                cancelText='İptal'
                severity='error'
                loading={deleting}
                onConfirm={handleDelete}
                onClose={() => !deleting && setDeleteTarget(null)}
            />
        </Grid>
    )
}

export default FinancialDiscountsView
