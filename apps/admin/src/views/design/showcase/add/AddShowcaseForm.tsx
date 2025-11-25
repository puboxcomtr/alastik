'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

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
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

type ProductType = {
    id: string
    name: string
    sku: string
    brand: string
    qty: number
}

const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

const AddShowcaseForm = () => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<ProductType[]>([])
    const [selectedProducts, setSelectedProducts] = useState<ProductType[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchPerformed, setSearchPerformed] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        order: 0,
        itemsPerRow: 4,
        isActive: true
    })

    const handleChange = (field: string) => (e: any) => {
        setFormData({
            ...formData,
            [field]: e.target.value
        })
    }

    const handleProductSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error('Lütfen arama yapmak için bir terim girin')
            return
        }

        setIsSearching(true)
        setSearchPerformed(true)

        try {
            const response = await fetch(`${baseUrl}/products?search=${encodeURIComponent(searchQuery)}`)

            if (!response.ok) throw new Error('Ürünler yüklenirken hata oluştu')

            const result = await response.json()
            const products = (result.data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                brand: p.brand,
                qty: p.qty
            }))

            setSearchResults(products)

            if (products.length === 0) {
                toast.info('Arama sonucu bulunamadı')
            }
        } catch (error) {
            toast.error('Ürün araması yapılırken hata oluştu')
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const handleProductSelect = (product: ProductType) => {
        const isSelected = selectedProducts.some(p => p.id === product.id)

        if (isSelected) {
            setSelectedProducts(prev => prev.filter(p => p.id !== product.id))
        } else {
            setSelectedProducts(prev => [...prev, product])
        }
    }

    const handleRemoveProduct = (productId: string) => {
        setSelectedProducts(prev => prev.filter(p => p.id !== productId))
    }

    const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= selectedProducts.length) return

        const newProducts = [...selectedProducts]
        const temp = newProducts[index]
        newProducts[index] = newProducts[newIndex]
        newProducts[newIndex] = temp
        setSelectedProducts(newProducts)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title.trim()) {
            toast.error('Vitrin başlığı zorunludur')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${baseUrl}/showcases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    products: selectedProducts.map(p => p.id)
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Vitrin oluşturulurken hata oluştu')
            }

            toast.success('Vitrin başarıyla oluşturuldu')
            router.push('/tr/apps/design/showcase/list')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Vitrin oluşturulurken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        <Typography variant='h4'>Yeni Vitrin Ekle</Typography>
                        <div className='flex gap-4'>
                            <Button variant='outlined' color='secondary' onClick={() => router.back()} disabled={loading}>
                                Geri Dön
                            </Button>
                            <Button variant='contained' type='submit' disabled={loading}>
                                {loading ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                        </div>
                    </div>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>Genel Bilgiler</Typography>
                                    <Grid container spacing={4}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Vitrin Başlığı'
                                                value={formData.title}
                                                onChange={handleChange('title')}
                                                required
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>Ürün Seçimi</Typography>

                                    <Grid container spacing={3} className='mb-4'>
                                        <Grid size={{ xs: 12, md: 8 }}>
                                            <TextField
                                                fullWidth
                                                size='small'
                                                placeholder='Ürün adı, stok kodu veya marka ile ara...'
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleProductSearch())}
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
                                            <Button fullWidth variant='outlined' onClick={handleProductSearch} disabled={isSearching}>
                                                {isSearching ? 'Aranıyor...' : 'Ara'}
                                            </Button>
                                        </Grid>
                                    </Grid>

                                    <div className='overflow-x-auto' style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                                <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                                    <th style={{ padding: '12px 8px', textAlign: 'left', width: '40px' }}></th>
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
                                                    searchResults.map((product) => (
                                                        <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                            <td style={{ padding: '12px 8px' }}>
                                                                <Checkbox
                                                                    size='small'
                                                                    checked={selectedProducts.some(p => p.id === product.id)}
                                                                    onChange={() => handleProductSelect(product)}
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
                                                                <Typography variant='body2' color={product.qty > 0 ? 'success.main' : 'error.main'}>
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

                        {selectedProducts.length > 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Card>
                                    <CardContent>
                                        <Typography variant='h6' className='mb-4'>
                                            Seçilen Ürünler ({selectedProducts.length})
                                        </Typography>
                                        <div className='overflow-x-auto'>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                                        <th style={{ padding: '12px 8px', textAlign: 'center', width: '80px' }}>Sıra</th>
                                                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Ürün Adı</th>
                                                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Stok Kodu</th>
                                                        <th style={{ padding: '12px 8px', textAlign: 'center', width: '120px' }}>İşlemler</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedProducts.map((product, index) => (
                                                        <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                                <div className='flex items-center justify-center gap-1'>
                                                                    <IconButton
                                                                        size='small'
                                                                        disabled={index === 0}
                                                                        onClick={() => handleMoveProduct(index, 'up')}
                                                                    >
                                                                        <i className='ri-arrow-up-line' />
                                                                    </IconButton>
                                                                    <Typography variant='body2'>{index + 1}</Typography>
                                                                    <IconButton
                                                                        size='small'
                                                                        disabled={index === selectedProducts.length - 1}
                                                                        onClick={() => handleMoveProduct(index, 'down')}
                                                                    >
                                                                        <i className='ri-arrow-down-line' />
                                                                    </IconButton>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 8px' }}>
                                                                <Typography variant='body2'>{product.name}</Typography>
                                                            </td>
                                                            <td style={{ padding: '12px 8px' }}>
                                                                <Typography variant='body2' color='text.secondary'>{product.sku}</Typography>
                                                            </td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                                <Tooltip title='Kaldır'>
                                                                    <IconButton size='small' color='error' onClick={() => handleRemoveProduct(product.id)}>
                                                                        <i className='ri-close-line' />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>Durum</Typography>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            />
                                        }
                                        label='Aktif'
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Grid container spacing={6}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                type='number'
                                                label='Sıra No'
                                                value={formData.order}
                                                onChange={handleChange('order')}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                select
                                                label='Satırdaki Ürün Adeti'
                                                value={formData.itemsPerRow}
                                                onChange={handleChange('itemsPerRow')}
                                            >
                                                {[1, 2, 3, 4, 5].map((num) => (
                                                    <MenuItem key={num} value={num}>
                                                        {num} Ürün
                                                    </MenuItem>
                                                ))}
                                            </TextField>
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

export default AddShowcaseForm