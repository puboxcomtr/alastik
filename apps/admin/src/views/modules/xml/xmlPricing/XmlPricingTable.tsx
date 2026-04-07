'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { toast } from 'react-toastify'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'

type KuralTipi = 'yuzde_artis' | 'yuzde_azalis' | 'sabit_artis' | 'sabit_azalis'
type Platform = 'b2b' | 'b2c' | 'alastik'

type FiyatKurali = {
    id: string
    platform: Platform
    source: string
    marka: string
    tip: KuralTipi
    deger: number
    aciklama: string
}

type SourceOption = { code: string; name: string }

const KURAL_TIPLERI: { value: KuralTipi; label: string }[] = [
    { value: 'yuzde_artis', label: 'Yüzdesel Artış' },
    { value: 'yuzde_azalis', label: 'Yüzdesel Azalış' },
    { value: 'sabit_artis', label: 'Sabit Artış (TL)' },
    { value: 'sabit_azalis', label: 'Sabit Azalış (TL)' }
]

const PLATFORMLAR: { value: Platform; label: string }[] = [
    { value: 'b2b', label: 'B2B' },
    { value: 'b2c', label: 'B2C' },
    { value: 'alastik', label: 'ALastik.com' }
]

const PLATFORM_RENK: Record<Platform, 'primary' | 'secondary' | 'warning'> = {
    b2b: 'primary',
    b2c: 'secondary',
    alastik: 'warning'
}

const bosKural = (): Omit<FiyatKurali, 'id'> => ({
    platform: 'b2b',
    source: '',
    marka: '',
    tip: 'yuzde_artis',
    deger: 0,
    aciklama: ''
})

const XmlPricingTable = () => {
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [sources, setSources] = useState<SourceOption[]>([])
    const [markalar, setMarkalar] = useState<string[]>([])
    const [kurallar, setKurallar] = useState<FiyatKurali[]>([])
    const [yeniKural, setYeniKural] = useState<Omit<FiyatKurali, 'id'>>(bosKural())

    const fetchMarkalar = useCallback(async (sourceCode: string) => {
        if (!sourceCode) { setMarkalar([]); return }
        try {
            const intg = await fetchAPI(API_ENDPOINTS.webxml.list() + `?search=${sourceCode}`, { cache: 'no-store' })
            if (intg.success && intg.data?.length > 0) {
                const id = intg.data[0].id
                const res = await fetchAPI(API_ENDPOINTS.webxml.getFilterOptions(id), { cache: 'no-store' })
                if (res.success) setMarkalar(res.data?.brands || [])
            }
        } catch {
            setMarkalar([])
        }
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [sourcesRes, pricingRes] = await Promise.all([
                fetchAPI(`${API_ENDPOINTS.webxml.allProducts()}?limit=1`, { cache: 'no-store' }),
                fetchAPI(API_ENDPOINTS.webxml.pricingRules(), { cache: 'no-store' })
            ])

            if (sourcesRes.success && sourcesRes.meta?.sources) {
                setSources(sourcesRes.meta.sources)
            }

            if (pricingRes.success) {
                setKurallar(pricingRes.data || [])
            }
        } catch {
            toast.error('Veriler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSourceChange = (sourceCode: string) => {
        setYeniKural(prev => ({ ...prev, source: sourceCode, marka: '' }))
        fetchMarkalar(sourceCode)
    }

    const handleKuralEkle = async () => {
        if (yeniKural.deger <= 0) {
            toast.error('Değer 0\'dan büyük olmalı')
            return
        }
        setSaving(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.webxml.pricingRulesAdd(), {
                method: 'POST',
                body: JSON.stringify(yeniKural)
            })
            if (res.success) {
                toast.success('Kural eklendi')
                setYeniKural(bosKural())
                setMarkalar([])
                fetchData()
            } else {
                toast.error(res.message || 'Kural eklenemedi')
            }
        } catch {
            toast.error('Kural eklenirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleKuralSil = async (id: string) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.webxml.pricingRulesDelete(id), {
                method: 'DELETE'
            })
            if (res.success) {
                toast.success('Kural silindi')
                fetchData()
            } else {
                toast.error(res.message || 'Kural silinemedi')
            }
        } catch {
            toast.error('Kural silinirken hata oluştu')
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </CardContent>
            </Card>
        )
    }

    return (
        <Grid container spacing={4}>
            <Grid item xs={12}>
                <Card>
                    <CardHeader
                        title='Fiyatlandırma Kuralları'
                        subheader='Ham fiyat üzerinden platform bazlı fiyatlar hesaplanır. B2C fiyatı B2B fiyatının %8 üstüdür.'
                        action={
                            <IconButton onClick={() => router.back()}>
                                <i className='ri-arrow-left-line' />
                            </IconButton>
                        }
                    />
                    <Divider />
                    <CardContent>
                        <Typography variant='subtitle2' sx={{ mb: 2 }}>Yeni Kural Ekle</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 3 }}>
                            <TextField
                                select
                                size='small'
                                label='Platform Seçiniz'
                                value={yeniKural.platform}
                                onChange={e => setYeniKural(prev => ({ ...prev, platform: e.target.value as Platform }))}
                                sx={{ minWidth: 160 }}
                            >
                                {PLATFORMLAR.map(p => (
                                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size='small'
                                label='Kaynak'
                                value={yeniKural.source}
                                onChange={e => handleSourceChange(e.target.value)}
                                sx={{ minWidth: 160 }}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {sources.map(s => (
                                    <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size='small'
                                label='Marka'
                                value={yeniKural.marka}
                                onChange={e => setYeniKural(prev => ({ ...prev, marka: e.target.value }))}
                                sx={{ minWidth: 160 }}
                                disabled={!yeniKural.source}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {markalar.map(m => (
                                    <MenuItem key={m} value={m}>{m}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size='small'
                                label='Kural Tipi'
                                value={yeniKural.tip}
                                onChange={e => setYeniKural(prev => ({ ...prev, tip: e.target.value as KuralTipi }))}
                                sx={{ minWidth: 180 }}
                            >
                                {KURAL_TIPLERI.map(t => (
                                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size='small'
                                label={yeniKural.tip.startsWith('yuzde') ? 'Yüzde (%)' : 'Tutar (TL)'}
                                type='number'
                                value={yeniKural.deger}
                                onChange={e => setYeniKural(prev => ({ ...prev, deger: parseFloat(e.target.value) || 0 }))}
                                sx={{ minWidth: 120 }}
                                inputProps={{ min: 0, step: 0.01 }}
                            />
                            <TextField
                                size='small'
                                label='Açıklama'
                                value={yeniKural.aciklama}
                                onChange={e => setYeniKural(prev => ({ ...prev, aciklama: e.target.value }))}
                                sx={{ minWidth: 200 }}
                            />
                            <Button
                                variant='contained'
                                onClick={handleKuralEkle}
                                disabled={saving}
                                startIcon={saving ? <CircularProgress size={16} /> : <i className='ri-add-line' />}
                            >
                                Ekle
                            </Button>
                        </Box>

                        <Divider sx={{ mb: 2 }} />
                        <Typography variant='subtitle2' sx={{ mb: 2 }}>Mevcut Kurallar</Typography>

                        {kurallar.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>Henüz kural eklenmemiş</Typography>
                        ) : (
                            kurallar.map(k => (
                                <Box key={k.id} sx={{
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    p: 1.5, mb: 1, borderRadius: 1,
                                    border: '1px solid', borderColor: 'divider',
                                    flexWrap: 'wrap'
                                }}>
                                    <Chip
                                        label={PLATFORMLAR.find(p => p.value === k.platform)?.label || k.platform}
                                        size='small'
                                        color={PLATFORM_RENK[k.platform]}
                                        variant='filled'
                                    />
                                    <Chip label={k.source ? (sources.find(s => s.code === k.source)?.name || k.source) : 'Tüm Kaynaklar'} size='small' color='info' variant='outlined' />
                                    {k.marka && <Chip label={k.marka} size='small' variant='outlined' />}
                                    <Chip
                                        label={KURAL_TIPLERI.find(t => t.value === k.tip)?.label}
                                        size='small'
                                        color={k.tip.includes('artis') ? 'success' : 'error'}
                                        variant='tonal'
                                    />
                                    <Typography variant='body2' fontWeight='bold'>
                                        {k.tip.startsWith('yuzde') ? `%${k.deger}` : `${k.deger} TL`}
                                    </Typography>
                                    {k.aciklama && (
                                        <Typography variant='body2' color='text.secondary' sx={{ flex: 1 }}>
                                            {k.aciklama}
                                        </Typography>
                                    )}
                                    <IconButton size='small' color='error' onClick={() => handleKuralSil(k.id)} sx={{ ml: 'auto' }}>
                                        <i className='ri-delete-bin-line text-[18px]' />
                                    </IconButton>
                                </Box>
                            ))
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default XmlPricingTable