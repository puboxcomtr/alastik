'use client'

// Ürün Butonları — her ürün için butonlara tıklanarak o ürüne özel açılıp kapatılır.
// Buton tanımları ve ürün başına açık butonlar API'den gelir (site bazlı); seçili ürünlere
// toplu açma/kapama yapılabilir. Değişiklik anında kaydedilir.
import { Suspense, useCallback, useEffect, useState } from 'react'

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import Autocomplete from '@mui/material/Autocomplete'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import CustomAvatar from '@core/components/mui/Avatar'
import tableStyles from '@core/styles/table.module.css'

import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'

type ButtonDef = { key: string; label: string; isActive: boolean }
type ProductRow = { key: string; name: string; stockCode: string; brand: string; stock: number; image: string; buttons: string[] }

// Filtreler — alanlar ve seçenek kaynakları Ürünler listesindeki filtrelerle aynıdır
type Filters = { brand: string; season: string; main_category: string; sub_category: string; stock_source: string; stock_min: string; stock_max: string }
type FilterOptions = { brands: string[]; seasons: string[]; mainCategories: string[] }

const EMPTY_FILTERS: Filters = { brand: '', season: '', main_category: '', sub_category: '', stock_source: '', stock_min: '', stock_max: '' }

// Stok kaynağı: kendi depomuzdaki ürünler / tedarikçi XML ürünleri
const STOCK_SOURCES = [
    { value: 'own', label: 'Stoktaki Ürünler' },
    { value: 'xml', label: 'XML Ürünleri' }
]

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_ROWS_PER_PAGE = 20
const SEARCH_DEBOUNCE_MS = 400

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)

const ProductButtonsList = () => {
    const { lang: locale } = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Sayfa adreste tutulur (?page=2)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

    const [definitions, setDefinitions] = useState<ButtonDef[]>([])
    const [rows, setRows] = useState<ProductRow[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [limit, setLimit] = useState(DEFAULT_ROWS_PER_PAGE)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<string[]>([])

    // Filtre paneli: taslak değerler "Filtrele" ile uygulanır
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
    const [options, setOptions] = useState<FilterOptions>({ brands: [], seasons: [], mainCategories: [] })
    const [subCategories, setSubCategories] = useState<string[]>([])
    // Kaydı süren buton: "<ürün>:<buton>" (tek) veya "bulk:<buton>" (toplu)
    const [pending, setPending] = useState<string | null>(null)

    const setPage = useCallback((next: number) => {
        const query = new URLSearchParams(searchParams.toString())

        query.set('page', String(next))
        router.push(`${pathname}?${query.toString()}`, { scroll: false })
    }, [router, pathname, searchParams])

    // Buton tanımları (yalnız aktif olanlar listelenir)
    useEffect(() => {
        fetchAPI(API_ENDPOINTS.productButtons.definitions(), { cache: 'no-store' })
            .then(res => setDefinitions((res.data || []).filter((d: ButtonDef) => d.isActive)))
            .catch(error => toast.error(errorMessage(error, 'Ürün butonları yüklenemedi')))
    }, [])

    // Filtre seçenekleri (marka, mevsim, ana kategori)
    useEffect(() => {
        fetchAPI(API_ENDPOINTS.filters.productOptions())
            .then(res => {
                if (res.success) setOptions({ brands: res.data.brands || [], seasons: res.data.seasons || [], mainCategories: res.data.mainCategories || [] })
            })
            .catch(() => { /* seçenekler yüklenemezse filtreler boş kalır, liste çalışmaya devam eder */ })
    }, [])

    // Alt kategoriler seçilen ana kategoriye göre yüklenir
    useEffect(() => {
        if (!draft.main_category) {
            setSubCategories([])

            return
        }

        fetchAPI(API_ENDPOINTS.filters.subCategories(draft.main_category))
            .then(res => setSubCategories(res.success ? res.data || [] : []))
            .catch(() => setSubCategories([]))
    }, [draft.main_category])

    const setDraftValue = (field: keyof Filters, value: string) => {
        setDraft(prev => ({ ...prev, [field]: value, ...(field === 'main_category' ? { sub_category: '' } : {}) }))
    }

    const changeDraft = (field: keyof Filters) => (e: { target: { value: string } }) => setDraftValue(field, e.target.value)

    // Yazarak aranabilen seçim alanı (boş = Tümü)
    const renderAutocomplete = (field: keyof Filters, label: string, choices: string[], disabled = false) => (
        <Autocomplete
            size='small'
            options={choices}
            value={draft[field] || null}
            onChange={(_, value) => setDraftValue(field, value || '')}
            disabled={disabled}
            noOptionsText='Sonuç bulunamadı'
            renderInput={params => <TextField {...params} label={label} placeholder='Tümü' />}
        />
    )

    const applyFilters = (next: Filters) => {
        setFilters(next)
        if (page !== 1) setPage(1)
        setFiltersOpen(false)
    }

    const resetFilters = () => {
        setDraft(EMPTY_FILTERS)
        setSearchInput('')
        setSearch('')
        applyFilters(EMPTY_FILTERS)
    }

    const activeFilterCount = Object.values(filters).filter(v => v.trim() !== '').length

    // Arama: yazarken kısa bir bekleme sonrası uygulanır
    useEffect(() => {
        if (searchInput.trim() === search) return

        const timer = setTimeout(() => {
            setSearch(searchInput.trim())
            if (page !== 1) setPage(1)
        }, SEARCH_DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)

            try {
                const res = await fetchAPI(API_ENDPOINTS.productButtons.products({ page, limit, search, filters }), { cache: 'no-store' })

                if (cancelled) return
                setRows(res.data || [])
                setTotal(res.meta?.total || 0)
                setSelected([])
            } catch (error) {
                if (!cancelled) toast.error(errorMessage(error, 'Ürünler yüklenemedi'))
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [page, limit, search, filters])

    const applyLocal = (keys: string[], button: string, active: boolean) => {
        setRows(prev => prev.map(row => {
            if (!keys.includes(row.key)) return row
            const without = row.buttons.filter(b => b !== button)

            return { ...row, buttons: active ? [...without, button] : without }
        }))
    }

    // Tek üründe butonu aç/kapat
    const toggle = async (row: ProductRow, button: string) => {
        const active = !row.buttons.includes(button)

        setPending(`${row.key}:${button}`)

        try {
            await fetchAPI(API_ENDPOINTS.productButtons.toggle(row.key), { method: 'PUT', body: JSON.stringify({ button, active }) })
            applyLocal([row.key], button, active)
        } catch (error) {
            toast.error(errorMessage(error, 'Buton güncellenemedi'))
        } finally {
            setPending(null)
        }
    }

    // Seçili ürünlerde toplu: hepsinde açıksa kapatır, değilse hepsinde açar
    const bulkToggle = async (button: string) => {
        const allActive = rows.filter(r => selected.includes(r.key)).every(r => r.buttons.includes(button))
        const active = !allActive

        setPending(`bulk:${button}`)

        try {
            await fetchAPI(API_ENDPOINTS.productButtons.bulkToggle(), { method: 'PUT', body: JSON.stringify({ keys: selected, button, active }) })
            applyLocal(selected, button, active)
            toast.success(`${selected.length} üründe buton ${active ? 'açıldı' : 'kapatıldı'}`)
        } catch (error) {
            toast.error(errorMessage(error, 'Butonlar güncellenemedi'))
        } finally {
            setPending(null)
        }
    }

    const allSelected = rows.length > 0 && selected.length === rows.length
    const selectedRows = rows.filter(r => selected.includes(r.key))

    const renderChip = (key: string, label: string, active: boolean, busy: boolean, onClick: () => void) => (
        <Chip
            key={key}
            size='small'
            label={label}
            variant={active ? 'filled' : 'outlined'}
            color={active ? 'primary' : 'default'}
            disabled={busy}
            icon={busy ? <CircularProgress size={12} color='inherit' /> : <i className={active ? 'ri-check-line' : 'ri-add-line'} />}
            onClick={onClick}
        />
    )

    return (
        <div className='flex flex-col gap-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <Typography variant='h4'>Ürün Butonları</Typography>
                <Button
                    variant='outlined'
                    color='secondary'
                    startIcon={<i className='ri-arrow-left-line' />}
                    onClick={() => router.push(`/${locale}/apps/products/list`)}
                >
                    Geri Dön
                </Button>
            </div>

            <Card>
                <div className='flex flex-col gap-4 p-5'>
                    <div className='flex flex-wrap items-center gap-4'>
                        <Badge badgeContent={activeFilterCount} color='primary'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                startIcon={<i className='ri-filter-3-line' />}
                                endIcon={<i className={filtersOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
                                onClick={() => setFiltersOpen(prev => !prev)}
                                sx={{ minWidth: 140 }}
                            >
                                Filtreler
                            </Button>
                        </Badge>
                        <TextField
                            size='small'
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder='Ürün adına göre arama yapabilirsiniz.'
                            sx={{ flex: 1, minWidth: 280 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position='start'>
                                            <i className='ri-search-line' />
                                        </InputAdornment>
                                    )
                                }
                            }}
                        />
                    </div>
                    <Collapse in={filtersOpen} timeout='auto' unmountOnExit>
                        <Divider />
                        <Box sx={{ pt: 5 }}>
                            <Grid
                                container
                                spacing={4}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        applyFilters(draft)
                                    }
                                }}
                            >
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        fullWidth
                                        size='small'
                                        label='Ürün Adı'
                                        placeholder='Ürün adı ile ara...'
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    {renderAutocomplete('brand', 'Marka', options.brands)}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Mevsim' value={draft.season} onChange={changeDraft('season')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        {options.seasons.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    {renderAutocomplete('main_category', 'Ana Kategori', options.mainCategories)}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    {renderAutocomplete('sub_category', 'Alt Kategori', subCategories, !draft.main_category || subCategories.length === 0)}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Stok Kaynağı' value={draft.stock_source} onChange={changeDraft('stock_source')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        {STOCK_SOURCES.map(src => <MenuItem key={src.value} value={src.value}>{src.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 2 }}>
                                    <TextField
                                        fullWidth
                                        size='small'
                                        type='number'
                                        label='Stok Adeti (En Az)'
                                        value={draft.stock_min}
                                        onChange={changeDraft('stock_min')}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 2 }}>
                                    <TextField
                                        fullWidth
                                        size='small'
                                        type='number'
                                        label='Stok Adeti (En Çok)'
                                        value={draft.stock_max}
                                        onChange={changeDraft('stock_max')}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button variant='outlined' color='secondary' onClick={resetFilters}>Temizle</Button>
                                    <Button variant='contained' onClick={() => applyFilters(draft)}>Filtrele</Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                    {selected.length > 0 ? (
                        <div className='flex flex-wrap items-center gap-2'>
                            <Typography variant='body2' color='text.primary' className='font-medium'>
                                Seçili {selected.length} ürüne uygula:
                            </Typography>
                            {definitions.map(def => renderChip(
                                `bulk-${def.key}`,
                                def.label,
                                selectedRows.every(r => r.buttons.includes(def.key)),
                                pending === `bulk:${def.key}`,
                                () => bulkToggle(def.key)
                            ))}
                        </div>
                    ) : null}
                </div>

                <div style={{ position: 'relative' }}>
                    {loading ? (
                        <div
                            className='flex items-center justify-center gap-3'
                            style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--mui-palette-background-paper)', opacity: 0.85, zIndex: 1000, minHeight: 200 }}
                        >
                            <CircularProgress size={24} />
                            <Typography>Ürünler yükleniyor...</Typography>
                        </div>
                    ) : null}

                    <div className='overflow-x-auto'>
                        <table className={tableStyles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: 48 }}>
                                        <Checkbox
                                            checked={allSelected}
                                            indeterminate={selected.length > 0 && !allSelected}
                                            onChange={e => setSelected(e.target.checked ? rows.map(r => r.key) : [])}
                                        />
                                    </th>
                                    <th style={{ width: 300 }}>Ürün</th>
                                    <th>Butonlar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={3} className='text-center py-4'>
                                            <Typography variant='body1' color='text.secondary'>
                                                {search || activeFilterCount > 0 ? 'Arama kriterlerinize uygun ürün bulunamadı' : 'Ürün bulunamadı'}
                                            </Typography>
                                        </td>
                                    </tr>
                                ) : null}
                                {rows.map(row => (
                                    <tr key={row.key}>
                                        <td>
                                            <Checkbox
                                                checked={selected.includes(row.key)}
                                                onChange={e => setSelected(prev => (e.target.checked ? [...prev, row.key] : prev.filter(k => k !== row.key)))}
                                            />
                                        </td>
                                        <td>
                                            <div className='flex items-center gap-3'>
                                                {row.image ? (
                                                    <img
                                                        src={getImageUrl(row.image)}
                                                        alt=''
                                                        width={40}
                                                        height={40}
                                                        style={{ objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
                                                    />
                                                ) : (
                                                    <CustomAvatar skin='light' color='secondary' variant='rounded' size={40}>
                                                        <i className='ri-image-line' />
                                                    </CustomAvatar>
                                                )}
                                                <div className='flex flex-col' style={{ minWidth: 0 }}>
                                                    <Typography className='font-medium' color='text.primary' noWrap title={row.name} sx={{ maxWidth: 230 }}>
                                                        {row.name}
                                                    </Typography>
                                                    <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 230 }}>
                                                        {[row.brand, row.stockCode, `Stok: ${row.stock.toLocaleString('tr-TR')}`].filter(Boolean).join(' · ')}
                                                    </Typography>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {definitions.length === 0 ? (
                                                <Typography variant='body2' color='text.disabled'>Tanımlı buton yok</Typography>
                                            ) : (
                                                <div className='flex flex-wrap gap-2 plb-1'>
                                                    {definitions.map(def => renderChip(
                                                        def.key,
                                                        def.label,
                                                        row.buttons.includes(def.key),
                                                        pending === `${row.key}:${def.key}`,
                                                        () => toggle(row, def.key)
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <TablePagination
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    component='div'
                    className='border-bs'
                    count={total}
                    rowsPerPage={limit}
                    page={page - 1}
                    onPageChange={(_, next) => setPage(next + 1)}
                    onRowsPerPageChange={e => {
                        setLimit(Number(e.target.value))
                        if (page !== 1) setPage(1)
                    }}
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                />
            </Card>
        </div>
    )
}

// useSearchParams kullanan liste Suspense içinde olmalıdır
const ProductButtonsView = () => (
    <Suspense>
        <ProductButtonsList />
    </Suspense>
)

export default ProductButtonsView
