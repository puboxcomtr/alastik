'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

const AddLabelPage = () => {
    const router = useRouter()
    const { lang: locale } = useParams()
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchPerformed, setSearchPerformed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoUrl: '',
        isActive: true,
        order: 0
    })

    const handleProductSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error('Lütfen arama yapmak için bir terim girin')
            return
        }

        setIsSearching(true)
        setSearchPerformed(true)

        try {
            const response = await fetchAPI(
                `${API_ENDPOINTS.products.list()}?search=${encodeURIComponent(searchQuery)}`
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
    }

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allProductIds = searchResults.map(p => p.id)
            setSelectedProducts(allProductIds)
        } else {
            setSelectedProducts([])
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
        setLoading(true)

        try {
            const response = await fetch(API_ENDPOINTS.labels.list(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    products: selectedProducts
                })
            })

            const result = await response.json()

            if (result.success) {
                toast.success('Etiket başarıyla oluşturuldu')
                router.push(`/${locale}/apps/label/list`)
            } else {
                toast.error(result.message || 'Etiket oluşturulurken hata oluştu')
            }
        } catch (error) {
            toast.error('Sunucuya bağlanılamadı')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6}>
                {/* Header */}
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col' style={{ gap: '10px' }}>
                        <div className='flex items-center gap-3'>
                            <Typography variant='h4' className='mbe-1'>
                                Yeni Etiket Ekle
                            </Typography>
                        </div>

                        <div className='flex flex-wrap max-sm:flex-col' style={{ gap: '15px' }}>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.back()}
                                disabled={loading}
                            >
                                Geri Dön
                            </Button>
                            <Button
                                variant='contained'
                                type='submit'
                                disabled={loading}
                            >
                                {loading ? 'Kaydediliyor...' : 'Kaydet'}
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

                                    {/* Arama Alanı */}
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 8 }}>
                                            <TextField
                                                fullWidth
                                                placeholder='Ürün adı, stok kodu veya marka ile ara...'
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
                                        <Grid size={{ xs: 12, md: 4 }}>
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

                                    {/* Ürün Listesi Tablosu */}
                                    <div className='overflow-x-auto mt-4' style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                                <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                                    <th style={{ padding: '12px 8px', textAlign: 'left', width: '40px' }}>
                                                        <Checkbox
                                                            size='small'
                                                            checked={searchResults.length > 0 && selectedProducts.length === searchResults.length}
                                                            indeterminate={selectedProducts.length > 0 && selectedProducts.length < searchResults.length}
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

export default AddLabelPage