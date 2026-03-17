'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import MenuItem from '@mui/material/MenuItem'

const EditLabelPage = () => {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const tagId = params.id as string
    const locale = params.lang as string

    // Liste sayfasına dönüş parametreleri
    const getListUrl = () => {
        const params = new URLSearchParams()
        params.set('page', searchParams.get('returnPage') || '1')
        params.set('limit', searchParams.get('returnLimit') || '50')
        const filterKeys = ['search', 'isActive', 'hasProducts', 'type', 'width', 'profile', 'rim', 'season']
        filterKeys.forEach(key => {
            const val = searchParams.get(key)
            if (val) params.set(key, val)
        })
        return `/${locale}/apps/label/list?${params.toString()}`
    }

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])
    const [currentProducts, setCurrentProducts] = useState<any[]>([])
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
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoUrl: '',
        isActive: true,
        order: 0
    })

    useEffect(() => {
        loadTag()
        loadFilterOptions()
    }, [tagId])

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

    const loadTag = async () => {
        try {
            setLoading(true)
            const response = await fetchAPI(API_ENDPOINTS.labels.detail(tagId))
            const tag = response.data || response

            setFormData({
                title: tag.title || '',
                description: tag.description || '',
                seoTitle: tag.seoTitle || '',
                seoDescription: tag.seoDescription || '',
                seoUrl: tag.seoUrl || '',
                isActive: tag.isActive !== undefined ? tag.isActive : true,
                order: tag.order || 0
            })

            if (tag.products && Array.isArray(tag.products)) {
                const productIds = tag.products.map((p: any) =>
                    typeof p === 'object' && p.id ? p.id : p
                )
                const productObjects = tag.products.filter((p: any) => typeof p === 'object' && p.id)

                setSelectedProducts(productIds)
                setCurrentProducts(productObjects)
            }
        } catch (error) {
            toast.error('Etiket yüklenirken hata oluştu')
            router.push(getListUrl())
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveProduct = (productId: string) => {
        setSelectedProducts(prev => prev.filter(id => id !== productId))
        setCurrentProducts(prev => prev.filter(p => p.id !== productId))
        toast.info('Ürün seçimden çıkarıldı')
    }

    const handleProductSearch = async () => {
        const hasFilter = searchQuery.trim() || productFilters.brand || productFilters.product_type || productFilters.season || productFilters.size || productFilters.stock_status
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

            const response = await fetchAPI(
                `${API_ENDPOINTS.products.list()}?${params.toString()}`
            )
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

    const handleProductSelect = (productId: string) => {
        setSelectedProducts(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId)
            } else {
                return [...prev, productId]
            }
        })

        const product = searchResults.find(p => p.id === productId)
        if (product && !currentProducts.find(p => p.id === productId)) {
            setCurrentProducts(prev => [...prev, product])
        } else if (!product) {
            setCurrentProducts(prev => prev.filter(p => p.id !== productId))
        }
    }

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allProductIds = searchResults.map(p => p.id)
            setSelectedProducts(prev => [...new Set([...prev, ...allProductIds])])

            const newProducts = searchResults.filter(
                product => !currentProducts.find(p => p.id === product.id)
            )
            setCurrentProducts(prev => [...prev, ...newProducts])
        } else {
            const searchResultIds = searchResults.map(p => p.id)
            setSelectedProducts(prev => prev.filter(id => !searchResultIds.includes(id)))
            setCurrentProducts(prev => prev.filter(p => !searchResultIds.includes(p.id)))
        }
    }

    const handleChange = (field: string) => (e: any) => {
        setFormData({
            ...formData,
            [field]: e.target.value
        })
    }

    const generateSlug = (text: string): string => {
        const turkishMap: Record<string, string> = {
            'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
            'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
            'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
        }

        return text
            .split('')
            .map(char => turkishMap[char] || char)
            .join('')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    }

    const handleAutoGenerateSeoUrl = () => {
        if (!formData.title || formData.title.trim() === '') {
            toast.error('Lütfen önce başlık alanını doldurun')
            return
        }

        const generatedUrl = generateSlug(formData.title)

        setFormData({
            ...formData,
            seoUrl: generatedUrl
        })

        toast.success('SEO URL otomatik oluşturuldu')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            await fetchAPI(API_ENDPOINTS.labels.detail(tagId), {
                method: 'PUT',
                body: JSON.stringify({
                    ...formData,
                    products: selectedProducts
                })
            })
            toast.success('Etiket başarıyla güncellendi')
            router.push(getListUrl())
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Etiket güncellenirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <div className='flex justify-center items-center p-10'>
                    <CircularProgress />
                </div>
            </Card>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6}>
                {/* Header */}
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col' style={{ gap: '10px' }}>
                        <div className='flex items-center gap-3'>
                            <Typography variant='h4' className='mbe-1'>
                                Etiket Düzenle
                            </Typography>
                        </div>

                        <div className='flex flex-wrap max-sm:flex-col' style={{ gap: '15px' }}>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.push(getListUrl())}
                                disabled={saving}
                            >
                                Geri Dön
                            </Button>
                            <Button
                                variant='contained'
                                type='submit'
                                disabled={saving}
                            >
                                {saving ? 'Güncelleniyor...' : 'Güncelle'}
                            </Button>
                        </div>
                    </div>
                </Grid>

                {/* Sol Kolon */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6}>
                        {/* Genel Bilgiler */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Genel Bilgiler
                                    </Typography>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Etiket Başlığı'
                                                placeholder='225/55 R16 Kış Lastikleri'
                                                value={formData.title}
                                                onChange={handleChange('title')}
                                                required
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Açıklama'
                                                placeholder='225/55 R16 ebadında kış lastikleri'
                                                value={formData.description}
                                                onChange={handleChange('description')}
                                                multiline
                                                rows={4}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Ürün Seçimi */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Ürün Seçimi ({selectedProducts.length} ürün seçili)
                                    </Typography>

                                    {/* Mevcut Seçili Ürünler */}
                                    {currentProducts.length > 0 && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <Typography variant='subtitle2' className='mb-2' color='text.secondary'>
                                                Mevcut Seçili Ürünler
                                            </Typography>
                                            <div className='overflow-x-auto' style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                                                        <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                                                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Ürün Adı</th>
                                                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Stok Kodu</th>
                                                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Marka</th>
                                                            <th style={{ padding: '12px 8px', textAlign: 'center', width: '80px' }}>İşlem</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentProducts.map((product: any) => (
                                                            <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                    <Typography variant='body2'>
                                                                        {product.diaData?.aciklama || product.name || 'N/A'}
                                                                    </Typography>
                                                                </td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                    <Typography variant='body2' color='text.secondary'>
                                                                        {product.diaData?.stokkartkodu || product.sku || 'N/A'}
                                                                    </Typography>
                                                                </td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                    <Typography variant='body2'>
                                                                        {product.diaData?.marka || product.brand || 'N/A'}
                                                                    </Typography>
                                                                </td>
                                                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                                    <Tooltip title='Çıkar'>
                                                                        <IconButton
                                                                            size='small'
                                                                            color='error'
                                                                            onClick={() => handleRemoveProduct(product.id)}
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
                                        </div>
                                    )}

                                    {/* Yeni Ürün Ekleme Alanı */}
                                    <Typography variant='subtitle2' className='mb-2' color='text.secondary'>
                                        Yeni Ürün Ekle
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                placeholder='Ürün adı, stok kodu ile ara...'
                                                size='small'
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyPress={(e) => {
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
                                                onChange={(e) => setProductFilters(prev => ({ ...prev, brand: e.target.value }))}
                                            >
                                                <MenuItem value=''>Tümü</MenuItem>
                                                {filterOptions.brands.map(b => (
                                                    <MenuItem key={b} value={b}>{b}</MenuItem>
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
                                                onChange={(e) => setProductFilters(prev => ({ ...prev, product_type: e.target.value }))}
                                            >
                                                <MenuItem value=''>Tümü</MenuItem>
                                                {filterOptions.productTypes.map(t => (
                                                    <MenuItem key={t} value={t}>{t}</MenuItem>
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
                                                onChange={(e) => setProductFilters(prev => ({ ...prev, season: e.target.value }))}
                                            >
                                                <MenuItem value=''>Tümü</MenuItem>
                                                {filterOptions.seasons.map(s => (
                                                    <MenuItem key={s} value={s}>{s}</MenuItem>
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
                                                onChange={(e) => setProductFilters(prev => ({ ...prev, size: e.target.value }))}
                                            >
                                                <MenuItem value=''>Tümü</MenuItem>
                                                {filterOptions.sizes.map(s => (
                                                    <MenuItem key={s} value={s}>{s}</MenuItem>
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
                                                onChange={(e) => setProductFilters(prev => ({ ...prev, stock_status: e.target.value }))}
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
                                    {/* Arama Sonuçları Tablosu */}
                                    <div className='overflow-x-auto mt-4' style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                                <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                                    <th style={{ padding: '12px 8px', textAlign: 'left', width: '40px' }}>
                                                        <Checkbox
                                                            size='small'
                                                            checked={searchResults.length > 0 && searchResults.every(p => selectedProducts.includes(p.id))}
                                                            indeterminate={searchResults.some(p => selectedProducts.includes(p.id)) && !searchResults.every(p => selectedProducts.includes(p.id))}
                                                            onChange={handleSelectAll}
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
                                                    searchResults.map((product: any) => (
                                                        <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                            <td style={{ padding: '12px 8px' }}>
                                                                <Checkbox
                                                                    size='small'
                                                                    checked={selectedProducts.includes(product.id)}
                                                                    onChange={() => handleProductSelect(product.id)}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '12px 8px' }}>
                                                                <Typography variant='body2'>{product.name}</Typography>
                                                            </td>
                                                            <td style={{ padding: '12px 8px' }}>
                                                                <Typography variant='body2' color='text.secondary'>{product.sku}</Typography>
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
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Sağ Kolon */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Durum
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            />
                                        }
                                        label='Aktif'
                                    />
                                    <Typography variant='body2' color='text.secondary' className='mt-2'>
                                        Etiket aktif olduğunda sitede gözükür
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Sıralama
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type='number'
                                        label='Öncelik Sırası'
                                        value={formData.order}
                                        onChange={handleChange('order')}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        SEO Bilgileri
                                    </Typography>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO Başlık'
                                                placeholder='225/55 R16 Kış Lastikleri - En Uygun Fiyatlar'
                                                value={formData.seoTitle}
                                                onChange={handleChange('seoTitle')}
                                            />
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    display: 'block',
                                                    mt: 1,
                                                    textAlign: 'right',
                                                    color: formData.seoTitle.length > 60 ? 'error.main' : 'success.main'
                                                }}
                                            >
                                                {formData.seoTitle.length} / 60 karakter
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO Açıklama'
                                                placeholder='225/55 R16 kış lastiklerinde en uygun fiyatlar'
                                                value={formData.seoDescription}
                                                onChange={handleChange('seoDescription')}
                                                multiline
                                                rows={3}
                                            />
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    display: 'block',
                                                    mt: 1,
                                                    textAlign: 'right',
                                                    color: formData.seoDescription.length > 160 ? 'error.main' : 'success.main'
                                                }}
                                            >
                                                {formData.seoDescription.length} / 160 karakter
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO URL'
                                                placeholder='225-55-16-kis-lastikleri'
                                                value={formData.seoUrl}
                                                onChange={handleChange('seoUrl')}
                                                helperText='Boş bırakılırsa başlıktan otomatik oluşturulur'
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment
                                                            position='start'
                                                            sx={{
                                                                backgroundColor: '#f0f0f0',
                                                                borderRadius: '4px',
                                                                paddingX: 1,
                                                                marginRight: 1,
                                                                color: 'text.secondary',
                                                                fontSize: '0.85rem'
                                                            }}
                                                        >
                                                            /etiket/
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: (
                                                        <InputAdornment position='end'>
                                                            <Tooltip title='Başlıktan otomatik URL oluştur'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={handleAutoGenerateSeoUrl}
                                                                    edge='end'
                                                                >
                                                                    <i className='ri-sparkling-line' />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default EditLabelPage