'use client'

import React, { useState, useEffect } from 'react'
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
import Box from '@mui/material/Box'
import { toast } from 'react-toastify'
import { API_ENDPOINTS } from '@libs/api'

interface MerchantSettings {
    isActive: boolean
    currency: string
    language: string
    country: string
    priceField: string
    includeTax: boolean
    taxRate: number
    onlyInStock: boolean
    minPrice: number
    minStock: number
    imageSource: string
    fieldMapping: {
        id: string
        title: string
        description: string
        brand: string
        gtin: string
        condition: string
    }
    shippingEnabled: boolean
    shippingCountry: string
    shippingPrice: number
    freeShippingThreshold: number
    feedFormat: string
    lastGenerated: string | null
    productCount: number
}

const defaultSettings: MerchantSettings = {
    isActive: true,
    currency: 'TRY',
    language: 'tr',
    country: 'TR',
    priceField: 'fiyat4',
    includeTax: true,
    taxRate: 20,
    onlyInStock: true,
    minPrice: 0,
    minStock: 1,
    imageSource: 'custom_first',
    fieldMapping: {
        id: 'stokkartkodu',
        title: 'seoTitle',
        description: 'customDescription',
        brand: 'marka',
        gtin: 'anabarkod',
        condition: 'new'
    },
    shippingEnabled: true,
    shippingCountry: 'TR',
    shippingPrice: 0,
    freeShippingThreshold: 0,
    feedFormat: 'xml',
    lastGenerated: null,
    productCount: 0
}

export default function Settings() {
    const [settings, setSettings] = useState<MerchantSettings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [priceFields, setPriceFields] = useState<{ key: string, value: number }[]>([])
    const [textFields, setTextFields] = useState<{ diaFields: { key: string, preview: string }[], customFields: { key: string, preview: string }[] }>({ diaFields: [], customFields: [] })
    const fetchPriceFields = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.merchantSettings.priceFields())
            const data = await res.json()
            if (data.success) setPriceFields(data.data)
        } catch { }
    }
    const fetchTextFields = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.merchantSettings.textFields())
            const data = await res.json()
            if (data.success) setTextFields(data.data)
        } catch { }
    }
    useEffect(() => {
        fetchSettings()
        fetchPriceFields()
        fetchTextFields()
    }, [])

    const fetchSettings = async () => {
        try {
            setLoading(true)
            const res = await fetch(API_ENDPOINTS.merchantSettings.get())
            const data = await res.json()
            if (data.success && data.data) {
                setSettings(prev => ({
                    ...prev,
                    ...data.data,
                    fieldMapping: { ...prev.fieldMapping, ...data.data.fieldMapping }
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
            const res = await fetch(API_ENDPOINTS.merchantSettings.update(), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })
            const data = await res.json()
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

    const updateField = (field: keyof MerchantSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }))
    }

    const updateFieldMapping = (field: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            fieldMapping: { ...prev.fieldMapping, [field]: value }
        }))
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Grid container spacing={8} justifyContent="center">
            <Grid size={{ xs: 10 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 8 }} container spacing={3}>

                        {/* Genel Ayarlar */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Genel Ayarlar"
                                    subheader="Google Merchant feed genel ayarları"
                                />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={settings.isActive}
                                                        onChange={e => updateField('isActive', e.target.checked)}
                                                    />
                                                }
                                                label="Feed Aktif"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Para Birimi"
                                                value={settings.currency}
                                                onChange={e => updateField('currency', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Dil"
                                                value={settings.language}
                                                onChange={e => updateField('language', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Ülke"
                                                value={settings.country}
                                                onChange={e => updateField('country', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                select fullWidth size="small" label="Feed Formatı"
                                                value={settings.feedFormat}
                                                onChange={e => updateField('feedFormat', e.target.value)}
                                            >
                                                <MenuItem value="xml">XML</MenuItem>
                                                <MenuItem value="csv">CSV</MenuItem>
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Fiyat Ayarları */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Fiyat Ayarları"
                                    subheader="Feed'de kullanılacak fiyat alanı ve vergi ayarları"
                                />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                select fullWidth size="small" label="Fiyat Alanı"
                                                value={settings.priceField}
                                                onChange={e => updateField('priceField', e.target.value)}
                                            >
                                                {priceFields.length === 0 && settings.priceField && (
                                                    <MenuItem value={settings.priceField}>{settings.priceField}</MenuItem>
                                                )}
                                                {priceFields.map(f => (
                                                    <MenuItem key={f.key} value={f.key}>
                                                        {f.key}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                fullWidth size="small" label="KDV Oranı (%)"
                                                type="number"
                                                value={settings.taxRate}
                                                onChange={e => updateField('taxRate', parseFloat(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={settings.includeTax}
                                                        onChange={e => updateField('includeTax', e.target.checked)}
                                                    />
                                                }
                                                label="KDV Dahil Fiyat"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Ürün Filtresi */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Ürün Filtresi"
                                    subheader="Feed'e dahil edilecek ürün kriterleri"
                                />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
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
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                fullWidth size="small" label="Minimum Fiyat"
                                                type="number"
                                                value={settings.minPrice}
                                                onChange={e => updateField('minPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
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

                        {/* Alan Eşleştirmeleri */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Alan Eşleştirmeleri"
                                    subheader="Google Merchant alanları ile veritabanı alanlarını eşleştirin"
                                />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                select fullWidth size="small" label="Başlık Alanı"
                                                value={settings.fieldMapping.title}
                                                onChange={e => updateFieldMapping('title', e.target.value)}
                                            >
                                                {[...textFields.diaFields, ...textFields.customFields].map(f => (
                                                    <MenuItem key={f.key} value={f.key}>
                                                        {f.key}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                select fullWidth size="small" label="Açıklama Alanı"
                                                value={settings.fieldMapping.description}
                                                onChange={e => updateFieldMapping('description', e.target.value)}
                                            >
                                                {[...textFields.diaFields, ...textFields.customFields].map(f => (
                                                    <MenuItem key={f.key} value={f.key}>
                                                        {f.key}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                select fullWidth size="small" label="Ürün Durumu"
                                                value={settings.fieldMapping.condition}
                                                onChange={e => updateFieldMapping('condition', e.target.value)}
                                            >
                                                <MenuItem value="new">Sıfır</MenuItem>
                                                <MenuItem value="used">İkinci El</MenuItem>
                                                <MenuItem value="refurbished">Yenilenmiş</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField
                                                select fullWidth size="small" label="Görsel Önceliği"
                                                value={settings.imageSource}
                                                onChange={e => updateField('imageSource', e.target.value)}
                                            >
                                                <MenuItem value="custom_first">Özel Görsel Önce</MenuItem>
                                                <MenuItem value="dia_first">DIA Görseli Önce</MenuItem>
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Kargo Ayarları */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader
                                    title="Kargo Ayarları"
                                    subheader="Feed'de gösterilecek kargo bilgileri"
                                />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={settings.shippingEnabled}
                                                        onChange={e => updateField('shippingEnabled', e.target.checked)}
                                                    />
                                                }
                                                label="Kargo Bilgisi Ekle"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Kargo Ülkesi"
                                                value={settings.shippingCountry}
                                                onChange={e => updateField('shippingCountry', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Kargo Ücreti"
                                                type="number"
                                                value={settings.shippingPrice}
                                                onChange={e => updateField('shippingPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 4 }}>
                                            <TextField
                                                fullWidth size="small" label="Ücretsiz Kargo Eşiği"
                                                type="number"
                                                value={settings.freeShippingThreshold}
                                                onChange={e => updateField('freeShippingThreshold', parseFloat(e.target.value) || 0)}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                    </Grid>

                    {/* Sağ Kolon */}
                    <Grid size={{ xs: 4 }} container spacing={5}>
                        <Grid size={{ xs: 12 }}>
                            <Card className="mb-5">
                                <CardHeader title="Feed Durumu" />
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
                                        <Divider />
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" color="text.secondary">Format</Typography>
                                            <Typography variant="body2" fontWeight="bold">{settings.feedFormat.toUpperCase()}</Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>

                            <Divider sx={{ my: 3 }} />

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