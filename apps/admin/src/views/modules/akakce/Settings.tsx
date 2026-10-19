'use client'

import React, { useState, useEffect, useRef } from 'react'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'
import { toast } from 'react-toastify'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { getActiveSite } from '@/utils/activeSite'

interface AkakceFieldMapping {
    sku: string
    name: string
    description: string
    brand: string
    barcode: string
    quantity: string
    category: string
}

type PickItem = { id: string, name: string, xmlName?: string }

interface SourceFilter {
    enabled: boolean
    mode: 'all' | 'category' | 'product' | 'custom'
    categories: PickItem[]
    products: PickItem[]
}

interface ProductSources {
    stock: SourceFilter
    xml: SourceFilter
}

interface AkakceSettings {
    isActive: boolean
    priceField: string
    includeTax: boolean
    taxRate: number
    onlyInStock: boolean
    minPrice: number
    minStock: number
    imageSource: string
    includeAdditionalImages: boolean
    productSources: ProductSources
    fieldMapping: AkakceFieldMapping
    shippingPrice: number
    freeShippingThreshold: number
    dayOfDelivery: number
    expressDeliveryTime: string
    localDelivery: string
    distributor: boolean
    campaignCode: string
    lastGenerated: string | null
    productCount: number
}

const defaultSettings: AkakceSettings = {
    isActive: true,
    priceField: 'fiyat4',
    includeTax: true,
    taxRate: 20,
    onlyInStock: true,
    minPrice: 0,
    minStock: 1,
    imageSource: 'custom_first',
    includeAdditionalImages: true,
    productSources: {
        stock: { enabled: true, mode: 'all', categories: [], products: [] },
        xml: { enabled: false, mode: 'all', categories: [], products: [] }
    },
    fieldMapping: {
        sku: 'diaData.stokkartkodu',
        name: 'diaData.aciklama',
        description: 'customData.customDescription',
        brand: 'diaData.marka',
        barcode: 'diaData.anabarkod',
        quantity: 'auto',
        category: 'auto'
    },
    shippingPrice: 0,
    freeShippingThreshold: 0,
    dayOfDelivery: 3,
    expressDeliveryTime: '',
    localDelivery: '',
    distributor: false,
    campaignCode: '',
    lastGenerated: null,
    productCount: 0
}

const CODE_FIELD_OPTIONS = [
    { key: 'diaData.stokkartkodu', label: 'Stok Kartı Kodu (stokkartkodu)' },
    { key: 'diaData.anabarkod', label: 'Ana Barkod (anabarkod)' },
    { key: 'diaData.barkodu', label: 'Barkod (barkodu)' },
    { key: 'diaData.marka', label: 'Marka (marka)' },
]

type FieldOption = { key: string, label: string, group: string, preview?: string }

const MappingRow = ({ title, required, children }: {
    title: string
    required?: boolean
    children: React.ReactNode
}) => (
    <>
        <Grid size={{ xs: 5 }} display="flex" alignItems="center">
            <Typography variant="body2" fontWeight={500}>{title}{required ? ' *' : ''}</Typography>
        </Grid>
        <Grid size={{ xs: 7 }} display="flex" alignItems="center">
            {children}
        </Grid>
    </>
)

const FieldAutocomplete = ({ value, onChange, options, allowEmpty }: {
    value: string
    onChange: (v: string) => void
    options: FieldOption[]
    allowEmpty?: boolean
}) => {
    const allOptions = [...options]
    if (value && !allOptions.some(o => o.key === value)) {
        allOptions.push({ key: value, label: value, group: 'Mevcut Değer' })
    }
    const selected = allOptions.find(o => o.key === value) || null

    return (
        <Autocomplete
            fullWidth
            size="small"
            options={allOptions}
            groupBy={o => o.group}
            getOptionLabel={o => o.label}
            isOptionEqualToValue={(o, v) => o.key === v.key}
            value={selected}
            onChange={(_, v) => onChange(v ? v.key : '')}
            disableClearable={!allowEmpty && !!selected}
            noOptionsText="Alan bulunamadı"
            renderOption={(props, o) => (
                <li {...props} key={o.key}>
                    <Box>
                        <Typography variant="body2">{o.label}</Typography>
                        {o.preview && <Typography variant="caption" color="text.secondary" display="block">{o.preview}</Typography>}
                    </Box>
                </li>
            )}
            renderInput={params => (
                <TextField {...params} size="small" placeholder={allowEmpty ? 'Boş bırak' : 'Alan seçin...'} />
            )}
        />
    )
}

const CategoryPicker = ({ value, onChange, options, loading }: {
    value: PickItem[]
    onChange: (v: PickItem[]) => void
    options: PickItem[]
    loading: boolean
}) => (
    <Autocomplete
        multiple
        fullWidth
        size="small"
        options={options}
        loading={loading}
        getOptionLabel={o => o.name}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        value={value}
        onChange={(_, v) => onChange(v)}
        noOptionsText="Kategori bulunamadı"
        renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option.id} label={option.name} size="small" />
            ))
        }
        renderInput={params => (
            <TextField {...params} size="small" placeholder="Kategori seçin..." />
        )}
    />
)

const ProductPicker = ({ value, onChange }: {
    value: PickItem[]
    onChange: (v: PickItem[]) => void
}) => {
    const [input, setInput] = useState('')
    const [options, setOptions] = useState<PickItem[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        if (input.trim().length < 2) {
            setOptions([])
            return
        }
        const timer = setTimeout(async () => {
            try {
                setSearching(true)
                const res = await fetchAPI(`${API_ENDPOINTS.products.list()}?search=${encodeURIComponent(input.trim())}&limit=50`)
                const items: PickItem[] = (res.data || []).map((p: any) => ({
                    id: String(p.sku || p.stokkartkodu || p.id || p._id),
                    name: p.name || p.sku || 'İsimsiz'
                }))
                setOptions(items)
            } catch {
                setOptions([])
            } finally {
                setSearching(false)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [input])

    return (
        <Autocomplete
            multiple
            fullWidth
            size="small"
            options={options}
            loading={searching}
            filterOptions={x => x}
            getOptionLabel={o => o.name}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={value}
            onChange={(_, v) => onChange(v)}
            onInputChange={(_, v) => setInput(v)}
            noOptionsText={input.trim().length < 2 ? 'Aramak için en az 2 karakter yazın' : 'Ürün bulunamadı'}
            renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option.id} label={option.name} size="small" />
                ))
            }
            renderOption={(props, o) => (
                <li {...props} key={o.id}>
                    <Box>
                        <Typography variant="body2">{o.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{o.id}</Typography>
                    </Box>
                </li>
            )}
            renderInput={params => (
                <TextField
                    {...params}
                    size="small"
                    placeholder="Ürün adı veya stok kodu arayın..."
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {searching ? <CircularProgress size={16} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        )
                    }}
                />
            )}
        />
    )
}

const CustomProductSelector = ({ value, onChange }: {
    value: PickItem[]
    onChange: (v: PickItem[]) => void
}) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchPerformed, setSearchPerformed] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        setIsImporting(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const json = await fetchAPI(API_ENDPOINTS.akakceSettings.importProducts(), {
                method: 'POST',
                body: formData
            })
            if (!json.success) throw new Error(json.message)

            const { matched = [], notFound = [] } = json.data || {}
            if (!matched.length) {
                toast.warn(json.data?.message || 'Dosyadaki kodlarla eşleşen ürün bulunamadı')
                return
            }

            const matchedById = new Map((matched as PickItem[]).map(m => [m.id, m]))
            const updatedExisting = value.map(v => {
                const m = matchedById.get(v.id)
                return m?.xmlName ? { ...v, xmlName: m.xmlName } : v
            })
            const existingIds = new Set(value.map(v => v.id))
            const additions = (matched as PickItem[]).filter(m => !existingIds.has(m.id))
            onChange([...updatedExisting, ...additions])

            toast.success(`${matched.length} ürün eşleşti, ${additions.length} yeni ürün seçime eklendi`)
            if (notFound.length) {
                toast.warn(`${notFound.length} kod eşleşmedi: ${notFound.slice(0, 5).join(', ')}${notFound.length > 5 ? '...' : ''}`)
            }
        } catch (err: any) {
            toast.error(err?.message || 'Excel içe aktarma sırasında hata oluştu')
        } finally {
            setIsImporting(false)
        }
    }

    const idOf = (p: any) => String(p.sku || p.stokkartkodu || p.id || p._id)
    const nameOf = (p: any) => p.name || p.sku || 'İsimsiz'
    const isSelected = (p: any) => value.some(v => v.id === idOf(p))

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error('Lütfen arama yapmak için bir terim girin')
            return
        }
        setIsSearching(true)
        setSearchPerformed(true)
        try {
            const res = await fetchAPI(`${API_ENDPOINTS.products.list()}?search=${encodeURIComponent(searchQuery.trim())}&limit=200`)
            setSearchResults(res.data || [])
            if ((res.data || []).length === 0) toast.info('Arama sonucu bulunamadı')
        } catch {
            toast.error('Ürün araması yapılırken hata oluştu')
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const toggleProduct = (p: any) => {
        const id = idOf(p)
        if (value.some(v => v.id === id)) {
            onChange(value.filter(v => v.id !== id))
        } else {
            onChange([...value, { id, name: nameOf(p) }])
        }
    }

    const allInResultsSelected = searchResults.length > 0 && searchResults.every(p => isSelected(p))
    const someInResultsSelected = searchResults.some(p => isSelected(p))

    const toggleAll = (checked: boolean) => {
        if (checked) {
            const additions = searchResults
                .filter(p => !isSelected(p))
                .map(p => ({ id: idOf(p), name: nameOf(p) }))
            onChange([...value, ...additions])
        } else {
            const resultIds = new Set(searchResults.map(idOf))
            onChange(value.filter(v => !resultIds.has(v.id)))
        }
    }

    return (
        <Box width="100%">
            <Typography variant="body2" fontWeight={500} className="mb-3">
                Ürün Seçimi ({value.length} ürün seçili)
            </Typography>

            {value.length > 0 && (
                <Box
                    display="flex"
                    flexWrap="wrap"
                    gap={1}
                    mb={3}
                    sx={{
                        maxHeight: 150,
                        overflowY: 'auto',
                        border: '1px solid var(--mui-palette-divider)',
                        borderRadius: 1,
                        p: 2
                    }}
                >
                    {value.map(v => (
                        <Chip
                            key={v.id}
                            label={v.name}
                            size="small"
                            onDelete={() => onChange(value.filter(x => x.id !== v.id))}
                        />
                    ))}
                </Box>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={handleImportFile}
            />
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        placeholder="Ürün adı veya stok kodu (SKU) ile ara..."
                        size="small"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSearch()
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <i className="ri-search-line" />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Button fullWidth variant="outlined" onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? 'Aranıyor...' : 'Ara'}
                    </Button>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        color="success"
                        startIcon={isImporting ? <CircularProgress size={16} /> : <i className="ri-file-excel-2-line" />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                    >
                        {isImporting ? 'Aktarılıyor...' : "Excel'den İçe Aktar"}
                    </Button>
                </Grid>
            </Grid>

            <div className="overflow-x-auto mt-4" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--mui-palette-background-paper)', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'left', width: 40 }}>
                                <Checkbox
                                    size="small"
                                    checked={allInResultsSelected}
                                    indeterminate={!allInResultsSelected && someInResultsSelected}
                                    onChange={e => toggleAll(e.target.checked)}
                                />
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Ürün Adı</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Stok Kodu</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Marka</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Stok</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!searchPerformed ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '40px 8px', textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Ürün aramak için yukarıdaki arama kutusunu kullanın
                                    </Typography>
                                </td>
                            </tr>
                        ) : isSearching ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '40px 8px', textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Ürünler aranıyor...
                                    </Typography>
                                </td>
                            </tr>
                        ) : searchResults.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '40px 8px', textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Arama sonucu bulunamadı
                                    </Typography>
                                </td>
                            </tr>
                        ) : (
                            searchResults.map((product: any) => (
                                <tr key={idOf(product)} style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                                    <td style={{ padding: '12px 8px' }}>
                                        <Checkbox
                                            size="small"
                                            checked={isSelected(product)}
                                            onChange={() => toggleProduct(product)}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <Typography variant="body2">{product.name}</Typography>
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <Typography variant="body2" color="text.secondary">{product.sku}</Typography>
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <Typography variant="body2">{product.brand}</Typography>
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                        <Typography variant="body2" color={product.qty > 0 ? 'success.main' : 'error.main'}>
                                            {product.qty}
                                        </Typography>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Box>
    )
}

const SourceFilterSection = ({ title, filter, onChange, categoryOptions, categoriesLoading }: {
    title: string
    filter: SourceFilter
    onChange: (f: SourceFilter) => void
    categoryOptions: PickItem[]
    categoriesLoading: boolean
}) => (
    <Grid container spacing={3}>
        <Grid size={{ xs: 12 }} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="body1" fontWeight={600}>{title}</Typography>
            <FormControlLabel
                control={
                    <Switch
                        checked={filter.enabled}
                        onChange={e => onChange({ ...filter, enabled: e.target.checked })}
                    />
                }
                label={filter.enabled ? 'Dahil' : 'Hariç'}
                labelPlacement="start"
            />
        </Grid>
        {filter.enabled && (
            <>
                <Grid size={{ xs: 4 }}>
                    <TextField
                        select fullWidth size="small" label="Filtreleme Türü"
                        value={filter.mode}
                        onChange={e => onChange({ ...filter, mode: e.target.value as SourceFilter['mode'] })}
                    >
                        <MenuItem value="all">Tümü</MenuItem>
                        <MenuItem value="category">Kategori Bazlı</MenuItem>
                        <MenuItem value="product">Ürün Bazlı</MenuItem>
                        <MenuItem value="custom">Özel Seçim</MenuItem>
                    </TextField>
                </Grid>
                <Grid size={{ xs: 8 }} display="flex" alignItems="center">
                    {filter.mode === 'category' && (
                        <CategoryPicker
                            value={filter.categories}
                            onChange={v => onChange({ ...filter, categories: v })}
                            options={categoryOptions}
                            loading={categoriesLoading}
                        />
                    )}
                    {filter.mode === 'product' && (
                        <ProductPicker
                            value={filter.products}
                            onChange={v => onChange({ ...filter, products: v })}
                        />
                    )}
                </Grid>
                {filter.mode === 'custom' && (
                    <Grid size={{ xs: 12 }}>
                        <CustomProductSelector
                            value={filter.products}
                            onChange={v => onChange({ ...filter, products: v })}
                        />
                    </Grid>
                )}
            </>
        )}
    </Grid>
)

export default function Settings() {
    const [settings, setSettings] = useState<AkakceSettings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [priceFields, setPriceFields] = useState<{ key: string, value: number }[]>([])
    const [textFields, setTextFields] = useState<{ diaFields: { key: string, preview: string }[], customFields: { key: string, preview: string }[] }>({ diaFields: [], customFields: [] })
    const [categoryOptions, setCategoryOptions] = useState<PickItem[]>([])
    const [categoriesLoading, setCategoriesLoading] = useState(false)

    const feedUrl = `${API_ENDPOINTS.akakceSettings.feedUrl()}?site=${getActiveSite()}`

    const fetchPriceFields = async () => {
        try {
            const data = await fetchAPI(API_ENDPOINTS.akakceSettings.priceFields())
            if (data.success) setPriceFields(data.data)
        } catch { }
    }
    const fetchTextFields = async () => {
        try {
            const data = await fetchAPI(API_ENDPOINTS.akakceSettings.textFields())
            if (data.success) setTextFields(data.data)
        } catch { }
    }
    const fetchCategories = async () => {
        try {
            setCategoriesLoading(true)
            const res = await fetchAPI(`${API_ENDPOINTS.categories.list()}?limit=1000`)
            const items: PickItem[] = (res.data || []).map((c: any) => ({
                id: String(c.id || c._id),
                name: c.name || c.categoryName || 'İsimsiz'
            }))
            setCategoryOptions(items)
        } catch {
            setCategoryOptions([])
        } finally {
            setCategoriesLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
        fetchPriceFields()
        fetchTextFields()
        fetchCategories()
    }, [])

    const fetchSettings = async () => {
        try {
            setLoading(true)
            const data = await fetchAPI(API_ENDPOINTS.akakceSettings.get())
            if (data.success && data.data) {
                setSettings(prev => ({
                    ...prev,
                    ...data.data,
                    fieldMapping: { ...prev.fieldMapping, ...data.data.fieldMapping },
                    productSources: {
                        stock: { ...prev.productSources.stock, ...(data.data.productSources?.stock || {}) },
                        xml: { ...prev.productSources.xml, ...(data.data.productSources?.xml || {}) }
                    }
                }))
            }
        } catch {
            toast.error('Ayarlar yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const data = await fetchAPI(API_ENDPOINTS.akakceSettings.update(), {
                method: 'PUT',
                body: JSON.stringify(settings)
            })
            if (data.success) {
                toast.success('Ayarlar kaydedildi')
            } else {
                toast.error(data.message || 'Kaydetme hatası')
            }
        } catch {
            toast.error('Ayarlar kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    const updateField = (field: keyof AkakceSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }))
    }

    const updateFieldMapping = (field: keyof AkakceFieldMapping, value: string) => {
        setSettings(prev => ({
            ...prev,
            fieldMapping: { ...prev.fieldMapping, [field]: value }
        }))
    }

    const updateSource = (source: keyof ProductSources, value: SourceFilter) => {
        setSettings(prev => ({
            ...prev,
            productSources: { ...prev.productSources, [source]: value }
        }))
    }

    const fieldOptions: FieldOption[] = [
        ...CODE_FIELD_OPTIONS.map(f => ({ ...f, group: 'Kod Alanları' })),
        ...textFields.diaFields.map(f => ({ key: f.key, label: f.key.replace('diaData.', ''), group: 'DIA Alanları', preview: f.preview })),
        ...textFields.customFields.map(f => ({ key: f.key, label: f.key.replace('customData.', ''), group: 'Özel Alanlar', preview: f.preview })),
    ]

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Grid container spacing={8} justifyContent="center">
            <Grid size={{ xs: 11 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 8 }} container spacing={3} alignContent="flex-start">

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Ürün Filtreleme"
                                    subheader="XML çıktısına hangi ürünlerin dahil edileceğini seçin"
                                />
                                <CardContent>
                                    <SourceFilterSection
                                        title="Stoklu Ürünler"
                                        filter={settings.productSources.stock}
                                        onChange={f => updateSource('stock', f)}
                                        categoryOptions={categoryOptions}
                                        categoriesLoading={categoriesLoading}
                                    />
                                    <Divider sx={{ my: 4 }} />
                                    <SourceFilterSection
                                        title="XML Ürünler"
                                        filter={settings.productSources.xml}
                                        onChange={f => updateSource('xml', f)}
                                        categoryOptions={categoryOptions}
                                        categoriesLoading={categoriesLoading}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Akakçe Alan Eşleştirmeleri"
                                    subheader="Soldaki Akakçe XML alanlarının karşısına sitenizdeki kaynak alanı seçin"
                                />
                                <CardContent>
                                    <Grid container spacing={4} alignItems="center">

                                        <MappingRow title="Stok Kodu" required>
                                            <FieldAutocomplete options={fieldOptions}
                                                value={settings.fieldMapping.sku}
                                                onChange={v => updateFieldMapping('sku', v)}
                                            />
                                        </MappingRow>

                                        <MappingRow title="Ürün Adı" required>
                                            <FieldAutocomplete options={fieldOptions}
                                                value={settings.fieldMapping.name}
                                                onChange={v => updateFieldMapping('name', v)}
                                            />
                                        </MappingRow>

                                        <MappingRow title="Ürün Linki" required>
                                            <TextField fullWidth size="small" value="Otomatik — ürün SEO URL'sinden oluşturulur" disabled />
                                        </MappingRow>

                                        <MappingRow title="Ana Görsel" required>
                                            <TextField
                                                select fullWidth size="small"
                                                value={settings.imageSource}
                                                onChange={e => updateField('imageSource', e.target.value)}
                                            >
                                                <MenuItem value="custom_first">Özel Görsel Önce</MenuItem>
                                                <MenuItem value="dia_first">DIA Görseli Önce</MenuItem>
                                            </TextField>
                                        </MappingRow>

                                        <MappingRow title="Ek Görseller">
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={settings.includeAdditionalImages}
                                                        onChange={e => updateField('includeAdditionalImages', e.target.checked)}
                                                    />
                                                }
                                                label="XML'e dahil et"
                                            />
                                        </MappingRow>

                                        <MappingRow title="Açıklama">
                                            <FieldAutocomplete options={fieldOptions}
                                                value={settings.fieldMapping.description}
                                                onChange={v => updateFieldMapping('description', v)}
                                                allowEmpty
                                            />
                                        </MappingRow>

                                        <MappingRow title="Distribütör Garantili">
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={settings.distributor}
                                                        onChange={e => updateField('distributor', e.target.checked)}
                                                    />
                                                }
                                                label={settings.distributor ? 'true olarak gönder' : 'Boş gönder'}
                                            />
                                        </MappingRow>

                                        <MappingRow title="Fiyat" required>
                                            <TextField
                                                select fullWidth size="small"
                                                value={settings.priceField}
                                                onChange={e => updateField('priceField', e.target.value)}
                                            >
                                                {priceFields.length === 0 && settings.priceField && (
                                                    <MenuItem value={settings.priceField}>{settings.priceField}</MenuItem>
                                                )}
                                                {priceFields.map(f => (
                                                    <MenuItem key={f.key} value={f.key}>{f.key}</MenuItem>
                                                ))}
                                            </TextField>
                                        </MappingRow>

                                        <MappingRow title="Kargo Ücreti">
                                            <Grid container spacing={2} width="100%">
                                                <Grid size={{ xs: 6 }}>
                                                    <TextField
                                                        fullWidth size="small" label="Kargo Ücreti" type="number"
                                                        value={settings.shippingPrice}
                                                        onChange={e => updateField('shippingPrice', parseFloat(e.target.value) || 0)}
                                                    />
                                                </Grid>
                                                <Grid size={{ xs: 6 }}>
                                                    <TextField
                                                        fullWidth size="small" label="Ücretsiz Kargo Eşiği" type="number"
                                                        value={settings.freeShippingThreshold}
                                                        onChange={e => updateField('freeShippingThreshold', parseFloat(e.target.value) || 0)}
                                                    />
                                                </Grid>
                                            </Grid>
                                        </MappingRow>

                                        <MappingRow title="Teslimat Süresi">
                                            <TextField
                                                fullWidth size="small" type="number"
                                                value={settings.dayOfDelivery}
                                                onChange={e => updateField('dayOfDelivery', parseInt(e.target.value) || 0)}
                                            />
                                        </MappingRow>

                                        <MappingRow title="Hızlı Teslimat Saati">
                                            <TextField
                                                fullWidth size="small" placeholder="Örn: 16"
                                                value={settings.expressDeliveryTime}
                                                onChange={e => updateField('expressDeliveryTime', e.target.value)}
                                            />
                                        </MappingRow>

                                        <MappingRow title="Stok Adedi" required>
                                            <TextField
                                                select fullWidth size="small"
                                                value={settings.fieldMapping.quantity}
                                                onChange={e => updateFieldMapping('quantity', e.target.value)}
                                            >
                                                <MenuItem value="auto">Otomatik — DIA stok toplamı</MenuItem>
                                                <MenuItem value="fixed_1">Sabit: 1</MenuItem>
                                                <MenuItem value="empty">Boş bırak</MenuItem>
                                            </TextField>
                                        </MappingRow>

                                        <MappingRow title="Marka" required>
                                            <FieldAutocomplete options={fieldOptions}
                                                value={settings.fieldMapping.brand}
                                                onChange={v => updateFieldMapping('brand', v)}
                                            />
                                        </MappingRow>

                                        <MappingRow title="Kategori Yolu" required>
                                            <TextField
                                                select fullWidth size="small"
                                                value={settings.fieldMapping.category}
                                                onChange={e => updateFieldMapping('category', e.target.value)}
                                            >
                                                <MenuItem value="auto">Otomatik — web kategori ağacından</MenuItem>
                                                <MenuItem value="diaData.kategori">DIA Kategorisi</MenuItem>
                                            </TextField>
                                        </MappingRow>

                                        <MappingRow title="Barkod">
                                            <FieldAutocomplete options={fieldOptions}
                                                value={settings.fieldMapping.barcode}
                                                onChange={v => updateFieldMapping('barcode', v)}
                                                allowEmpty
                                            />
                                        </MappingRow>

                                        <MappingRow title="Yerinde Teslimat">
                                            <TextField
                                                fullWidth size="small" placeholder="Örn: 34,6,35"
                                                value={settings.localDelivery}
                                                onChange={e => updateField('localDelivery', e.target.value)}
                                            />
                                        </MappingRow>

                                        <MappingRow title="Kampanya Kodu">
                                            <TextField
                                                fullWidth size="small" placeholder="Örn: 3A2O"
                                                value={settings.campaignCode}
                                                onChange={e => updateField('campaignCode', e.target.value)}
                                            />
                                        </MappingRow>

                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Genel Kriterler"
                                    subheader="XML'e dahil edilecek ürünler için asgari kriterler"
                                />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 4 }}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={settings.onlyInStock}
                                                        onChange={e => updateField('onlyInStock', e.target.checked)}
                                                    />
                                                }
                                                label="Sadece Stokta Olanlar"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Minimum Fiyat"
                                                type="number"
                                                value={settings.minPrice}
                                                onChange={e => updateField('minPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Minimum Stok"
                                                type="number"
                                                value={settings.minStock}
                                                onChange={e => updateField('minStock', parseInt(e.target.value) || 1)}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                    </Grid>

                    <Grid size={{ xs: 4 }} container spacing={5} alignContent="flex-start">
                        <Grid size={{ xs: 12 }}>
                            <Card className="mb-5">
                                <CardHeader
                                    title="Genel Ayarlar"
                                    subheader="Akakçe XML çıktısı genel ayarları"
                                />
                                <CardContent>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.isActive}
                                                onChange={e => updateField('isActive', e.target.checked)}
                                            />
                                        }
                                        label="XML Aktif"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="mb-5">
                                <CardHeader title="XML Durumu" />
                                <CardContent>
                                    <Box display="flex" flexDirection="column" gap={1.5}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" color="text.secondary">Durum</Typography>
                                            <Typography variant="body2" fontWeight="bold" color={settings.isActive ? 'success.main' : 'error.main'}>
                                                {settings.isActive ? 'Aktif' : 'Pasif'}
                                            </Typography>
                                        </Box>
                                        <Divider />
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" color="text.secondary">Ürün Sayısı</Typography>
                                            <Typography variant="body2" fontWeight="bold">{settings.productCount.toLocaleString('tr-TR')}</Typography>
                                        </Box>
                                        <Divider />
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" color="text.secondary">Son Oluşturma</Typography>
                                            <Typography variant="body2">
                                                {settings.lastGenerated
                                                    ? new Date(settings.lastGenerated).toLocaleString('tr-TR')
                                                    : '-'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>

                            <Divider sx={{ my: 3 }} />

                            <Button
                                fullWidth
                                variant="outlined"
                                color="secondary"
                                className="mb-3"
                                onClick={() => window.open(feedUrl, '_blank')}
                                startIcon={<i className="ri-code-s-slash-line" />}
                            >
                                XML Çıktısı
                            </Button>

                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                onClick={handleSave}
                                disabled={saving}
                                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                            >
                                {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                            </Button>
                        </Grid>
                    </Grid>

                </Grid>
            </Grid>
        </Grid>
    )
}
