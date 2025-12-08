// apps/admin/src/views/seo/other/index.jsx
'use client'

import { useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

const Other = ({ formData, setFormData, handleSave, saving }) => {
    const [selectedPage, setSelectedPage] = useState('newProducts')

    // Tüm sayfa listesi
    const pages = [
        { key: 'newProducts', label: 'Yeni Ürünler Sayfası' },
        { key: 'discountedProducts', label: 'İndirimli Ürünler Sayfası' },
        { key: 'sponsorProducts', label: 'Sponsor Ürünler Sayfası' },
        { key: 'popularProducts', label: 'Popüler Ürünler Sayfası' },
        { key: 'packageBuilder', label: 'Paket Oluşturucu Sayfası' },
        { key: 'seoTag', label: 'SEO + Etiket Sayfası' },
        { key: 'missedOpportunities', label: 'Kaçan Fırsatlar Sayfası' },
        { key: 'contact', label: 'İletişim Sayfası' },
        { key: 'blog', label: 'Blog Sayfası' },
        { key: 'categories', label: 'Kategoriler Sayfası' },
        { key: 'brands', label: 'Markalar Sayfası' },
        { key: 'news', label: 'Haberler Sayfası' },
        { key: 'cart', label: 'Sepet Sayfası' },
        { key: 'productSearch', label: 'Ürün Arama Sayfası' },
        { key: 'register', label: 'Üye Ol Sayfası' },
        { key: 'login', label: 'Üye Giriş Sayfası' },
        { key: 'forgotPassword', label: 'Şifremi Unuttum Sayfası' },
        { key: 'orderTracking', label: 'Sipariş Takibi Sayfası' }
    ]

    // Seçili sayfa verisi
    const currentPageData = formData.other?.[selectedPage] || { title: '', description: '' }

    return (
        <Card>
            <Grid container>
                {/* Sol Menü */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <CardHeader title='Sayfalar' />
                    <Divider />
                    <List sx={{ maxHeight: '600px', overflow: 'auto' }}>
                        {pages.map((page) => (
                            <ListItem key={page.key} disablePadding>
                                <ListItemButton
                                    selected={selectedPage === page.key}
                                    onClick={() => setSelectedPage(page.key)}
                                >
                                    <ListItemText primary={page.label} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Grid>

                {/* Sağ İçerik */}
                <Grid size={{ xs: 12, md: 9 }}>
                    <CardHeader
                        title={pages.find(p => p.key === selectedPage)?.label || 'SEO Ayarları'}
                        subheader='Sayfa SEO bilgilerini düzenleyebilirsiniz. Sadece {site-adi} değişkenini kullanabilirsiniz.'
                    />
                    <Divider />
                    <CardContent>
                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12 }}>
                                <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
                                    <Typography variant='subtitle2' className='mb-2 font-semibold'>
                                        Kullanılabilir Değişken:
                                    </Typography>
                                    <Chip
                                        label='{site-adi} - Sitenizin genel başlığı'
                                        size='small'
                                        variant='outlined'
                                    />
                                </div>
                            </Grid>

                            {/* SEO Title */}
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label='SEO Başlığı'
                                    placeholder='Örn: Yeni Ürünler - {site-adi}'
                                    value={currentPageData.title}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        other: {
                                            ...prev.other,
                                            [selectedPage]: {
                                                ...currentPageData,
                                                title: e.target.value
                                            }
                                        }
                                    }))}
                                    inputProps={{ maxLength: 60 }}
                                    helperText={
                                        <span className="flex justify-between items-center">
                                            <span>Bu alan arama motorlarında başlık olarak görünecektir</span>
                                            <span className={currentPageData.title.length <= 60 ? "text-green-500" : "text-red-500"}>
                                                {currentPageData.title.length}/60
                                            </span>
                                        </span>
                                    }
                                />
                            </Grid>

                            {/* SEO Description */}
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label='SEO Açıklaması'
                                    placeholder='Örn: En yeni lastik modellerini {site-adi} üzerinde bulabilirsiniz.'
                                    value={currentPageData.description}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        other: {
                                            ...prev.other,
                                            [selectedPage]: {
                                                ...currentPageData,
                                                description: e.target.value
                                            }
                                        }
                                    }))}
                                    inputProps={{ maxLength: 160 }}
                                    helperText={
                                        <span className="flex justify-between items-center">
                                            <span>Bu alan arama motorlarında açıklama olarak görünecektir</span>
                                            <span className={currentPageData.description.length <= 160 ? "text-green-500" : "text-red-500"}>
                                                {currentPageData.description.length}/160
                                            </span>
                                        </span>
                                    }
                                />
                            </Grid>

                            {/* Kaydet Butonu */}
                            <Grid size={{ xs: 12 }} className='flex gap-4 flex-wrap justify-end'>
                                <Button
                                    variant='contained'
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Kaydediliyor...' : 'Tüm SEO Ayarlarını Kaydet'}
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Grid>
            </Grid>
        </Card>
    )
}

export default Other