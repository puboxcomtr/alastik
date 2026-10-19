'use client'

import { useState, useEffect } from 'react'

import Grid from '@mui/material/Grid2'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@/libs/api'

interface TargetItem {
    targetId: string
    targetName: string
    extra?: string
}

interface LimitTargetSelectorProps {
    limitType: 'product' | 'category' | 'brand'
    targets: TargetItem[]
    onChange: (targets: TargetItem[]) => void
}

const titleLabels = {
    product: 'Ürün Seçimi',
    category: 'Kategori Seçimi',
    brand: 'Marka Seçimi'
}

const LimitTargetSelector = ({ limitType, targets, onChange }: LimitTargetSelectorProps) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchPerformed, setSearchPerformed] = useState(false)

    const [productFilters, setProductFilters] = useState({
        brand: '',
        product_type: '',
        season: '',
        size: '',
        stock_status: ''
    })
    const [filterOptions, setFilterOptions] = useState<{
        brands: string[]
        productTypes: string[]
        seasons: string[]
        sizes: string[]
    }>({ brands: [], productTypes: [], seasons: [], sizes: [] })

    const [allOptions, setAllOptions] = useState<any[]>([])
    const [loadingOptions, setLoadingOptions] = useState(false)

    useEffect(() => {
        if (limitType === 'product') {
            loadFilterOptions()
        }
        if (limitType === 'category' || limitType === 'brand') {
            loadAllOptions()
        }
        setSearchQuery('')
        setSearchResults([])
        setSearchPerformed(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limitType])

    const loadFilterOptions = async () => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.filters.productOptions())
            if (res.success) {
                setFilterOptions(res.data)
            }
        } catch (err) {
            console.error('Filtre seçenekleri yüklenemedi:', err)
        }
    }

    const loadAllOptions = async () => {
        setLoadingOptions(true)
        try {
            let url = ''
            if (limitType === 'category') {
                url = `${API_ENDPOINTS.categories.list()}?limit=1000`
            } else if (limitType === 'brand') {
                url = `${API_ENDPOINTS.brands.list()}?limit=1000`
            }
            const res = await fetchAPI(url, { cache: 'no-store' })
            setAllOptions(res.data || [])
        } catch (err) {
            console.error('Liste yüklenemedi:', err)
        } finally {
            setLoadingOptions(false)
        }
    }

    const handleProductSearch = async () => {
        const hasFilter =
            searchQuery.trim() ||
            productFilters.brand ||
            productFilters.product_type ||
            productFilters.season ||
            productFilters.size ||
            productFilters.stock_status

        if (!hasFilter) {
            toast.error('Lütfen arama terimi girin veya en az bir filtre seçin')
            return
        }

        setIsSearching(true)
        setSearchPerformed(true)

        try {
            const params = new URLSearchParams()
            if (searchQuery.trim()) params.set('search', searchQuery.trim())
            if (productFilters.brand) params.set('brand', productFilters.brand)
            if (productFilters.product_type) params.set('product_type', productFilters.product_type)
            if (productFilters.season) params.set('season', productFilters.season)
            if (productFilters.size) params.set('size', productFilters.size)
            if (productFilters.stock_status) params.set('stock_status', productFilters.stock_status)
            params.set('limit', '200')

            const response = await fetchAPI(`${API_ENDPOINTS.products.list()}?${params.toString()}`)
            setSearchResults(response.data || [])

            if ((response.data || []).length === 0) {
                toast.info('Arama sonucu bulunamadı')
            }
        } catch (error) {
            toast.error('Ürün araması yapılırken hata oluştu')
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const getTargetIdFromProduct = (p: any): string => String(p.sku || p.stokkartkodu || p.id)
    const getTargetIdFromOption = (item: any): string =>
        String(item.id || item._id || item.diaKey || item.code || '')

    const isSelected = (id: string) => targets.some(t => t.targetId === id)

    const handleProductToggle = (product: any) => {
        const id = getTargetIdFromProduct(product)
        const name = product.name || product.sku || 'İsimsiz'
        const extra = product.sku || ''

        if (isSelected(id)) {
            onChange(targets.filter(t => t.targetId !== id))
        } else {
            onChange([...targets, { targetId: id, targetName: name, extra }])
        }
    }

    const handleSelectAllProducts = (checked: boolean) => {
        if (checked) {
            const currentIds = new Set(targets.map(t => t.targetId))
            const additions: TargetItem[] = []
            for (const p of searchResults) {
                const id = getTargetIdFromProduct(p)
                if (!currentIds.has(id)) {
                    additions.push({
                        targetId: id,
                        targetName: p.name || p.sku || 'İsimsiz',
                        extra: p.sku || ''
                    })
                }
            }
            onChange([...targets, ...additions])
        } else {
            const searchIds = new Set(searchResults.map(p => getTargetIdFromProduct(p)))
            onChange(targets.filter(t => !searchIds.has(t.targetId)))
        }
    }

    const handleRemoveTarget = (targetId: string) => {
        onChange(targets.filter(t => t.targetId !== targetId))
    }

    const handleOptionSelect = (item: any) => {
        if (!item) return
        const id = getTargetIdFromOption(item)
        const name = item.name || item.diaBrand || item.diaMarkaAck || 'İsimsiz'
        const extra = item.code || item.seoUrl || ''

        if (isSelected(id)) {
            toast.info('Bu öğe zaten seçilmiş')
            return
        }
        onChange([...targets, { targetId: id, targetName: name, extra }])
    }

    return (
        <Box>
            <Typography variant='h6' sx={{ mb: 3 }}>
                {titleLabels[limitType]} ({targets.length} adet seçili)
            </Typography>

            {targets.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
                        Mevcut Seçili {limitType === 'product' ? 'Ürünler' : limitType === 'category' ? 'Kategoriler' : 'Markalar'}
                    </Typography>
                    <div className='overflow-x-auto' style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>
                                        {limitType === 'product' ? 'Ürün Adı' : limitType === 'category' ? 'Kategori Adı' : 'Marka Adı'}
                                    </th>
                                    {limitType === 'product' && (
                                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Stok Kodu</th>
                                    )}
                                    <th style={{ padding: '12px 8px', textAlign: 'center', width: 80 }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targets.map(t => (
                                    <tr key={t.targetId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '12px 8px' }}>
                                            <Typography variant='body2'>{t.targetName}</Typography>
                                        </td>
                                        {limitType === 'product' && (
                                            <td style={{ padding: '12px 8px' }}>
                                                <Typography variant='body2' color='text.secondary'>
                                                    {t.targetId}
                                                </Typography>
                                            </td>
                                        )}
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                            <Tooltip title='Çıkar'>
                                                <IconButton
                                                    size='small'
                                                    color='error'
                                                    onClick={() => handleRemoveTarget(t.targetId)}
                                                >
                                                    <i className='ri-close-line' />
                                                </IconButton>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Box>
            )}

            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
                Yeni {limitType === 'product' ? 'Ürün' : limitType === 'category' ? 'Kategori' : 'Marka'} Ekle
            </Typography>

            {limitType === 'product' ? (
                <>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                size='small'
                                placeholder='Ürün adı, stok kodu ile ara...'
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyPress={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleProductSearch()
                                    }
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position='start'>
                                            <i className='ri-search-line' />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Marka'
                                value={productFilters.brand}
                                onChange={e => setProductFilters(prev => ({ ...prev, brand: e.target.value }))}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {filterOptions.brands.map(b => (
                                    <MenuItem key={b} value={b}>
                                        {b}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Ürün Tipi'
                                value={productFilters.product_type}
                                onChange={e => setProductFilters(prev => ({ ...prev, product_type: e.target.value }))}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {filterOptions.productTypes.map(t => (
                                    <MenuItem key={t} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Mevsim'
                                value={productFilters.season}
                                onChange={e => setProductFilters(prev => ({ ...prev, season: e.target.value }))}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {filterOptions.seasons.map(s => (
                                    <MenuItem key={s} value={s}>
                                        {s}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Ebat'
                                value={productFilters.size}
                                onChange={e => setProductFilters(prev => ({ ...prev, size: e.target.value }))}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {filterOptions.sizes.map(s => (
                                    <MenuItem key={s} value={s}>
                                        {s}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Stok'
                                value={productFilters.stock_status}
                                onChange={e => setProductFilters(prev => ({ ...prev, stock_status: e.target.value }))}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                <MenuItem value='in_stock'>Stokta Var</MenuItem>
                                <MenuItem value='out_of_stock'>Stokta Yok</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Button
                                fullWidth
                                variant='outlined'
                                size='medium'
                                onClick={handleProductSearch}
                                disabled={isSearching}
                            >
                                {isSearching ? 'Aranıyor...' : 'Ara'}
                            </Button>
                        </Grid>
                    </Grid>

                    <div className='overflow-x-auto mt-4' style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4, marginTop: 16 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', width: 40 }}>
                                        <Checkbox
                                            size='small'
                                            checked={searchResults.length > 0 && searchResults.every(p => isSelected(getTargetIdFromProduct(p)))}
                                            indeterminate={
                                                searchResults.some(p => isSelected(getTargetIdFromProduct(p))) &&
                                                !searchResults.every(p => isSelected(getTargetIdFromProduct(p)))
                                            }
                                            onChange={e => handleSelectAllProducts(e.target.checked)}
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
                                            <Typography variant='body2' color='text.secondary'>
                                                Ürün aramak için yukarıdaki arama kutusunu kullanın
                                            </Typography>
                                        </td>
                                    </tr>
                                ) : isSearching ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px 8px', textAlign: 'center' }}>
                                            <Typography variant='body2' color='text.secondary'>
                                                Ürünler aranıyor...
                                            </Typography>
                                        </td>
                                    </tr>
                                ) : searchResults.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px 8px', textAlign: 'center' }}>
                                            <Typography variant='body2' color='text.secondary'>
                                                Arama sonucu bulunamadı
                                            </Typography>
                                        </td>
                                    </tr>
                                ) : (
                                    searchResults.map((product: any) => {
                                        const id = getTargetIdFromProduct(product)
                                        return (
                                            <tr key={id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <Checkbox
                                                        size='small'
                                                        checked={isSelected(id)}
                                                        onChange={() => handleProductToggle(product)}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <Typography variant='body2'>{product.name}</Typography>
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <Typography variant='body2' color='text.secondary'>
                                                        {product.sku}
                                                    </Typography>
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <Typography variant='body2'>{product.brand}</Typography>
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                                    <Typography
                                                        variant='body2'
                                                        color={product.qty > 0 ? 'success.main' : 'error.main'}
                                                    >
                                                        {product.qty}
                                                    </Typography>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <Autocomplete
                    options={allOptions}
                    getOptionLabel={(opt: any) =>
                        opt.name || opt.diaBrand || opt.diaMarkaAck || ''
                    }
                    isOptionEqualToValue={(opt, val) =>
                        getTargetIdFromOption(opt) === getTargetIdFromOption(val)
                    }
                    loading={loadingOptions}
                    onChange={(_, value) => {
                        handleOptionSelect(value)
                    }}
                    renderInput={params => (
                        <TextField
                            {...params}
                            size='small'
                            placeholder={`${limitType === 'category' ? 'Kategori' : 'Marka'} seç...`}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loadingOptions && <CircularProgress size={18} />}
                                        {params.InputProps.endAdornment}
                                    </>
                                )
                            }}
                        />
                    )}
                />
            )}
        </Box>
    )
}

export default LimitTargetSelector