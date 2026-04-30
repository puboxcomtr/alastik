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
import tableStyles from '@core/styles/table.module.css'

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
    const [filterPlatform, setFilterPlatform] = useState<string>('')

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
    const filteredKurallar = filterPlatform ? kurallar.filter(k => k.platform === filterPlatform) : kurallar
    return (
        <>
        return (compass);
            <Grid container spacing={4}>
                <Grid item xs={12}>
                    <Card>
                        <CardHeader
                            title='Fiyatlandırma Kuralları'
                            subheader='Ham fiyat üzerinden platform bazlı fiyatlar hesaplanır. '
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
                                    value={yeniKural.source === '' ? '__tumu__' : yeniKural.source}
                                    onChange={e => handleSourceChange(e.target.value === '__tumu__' ? '' : e.target.value)}
                                    sx={{ minWidth: 160 }}
                                >
                                    <MenuItem value='__tumu__'>Tümü</MenuItem>
                                    {sources.map(s => (
                                        <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    select
                                    size='small'
                                    label='Marka'
                                    value={yeniKural.marka === '' ? '__tumü__' : yeniKural.marka}
                                    onChange={e => setYeniKural(prev => ({ ...prev, marka: e.target.value === '__tumü__' ? '' : e.target.value }))}
                                    sx={{ minWidth: 160 }}
                                >
                                    <MenuItem value='__tumü__'>Tümü</MenuItem>
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
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardHeader
                            title='Mevcut Kurallar'
                            subheader={`Toplam ${filteredKurallar.length} kural`}
                            action={
                                <TextField
                                    select size='small' label='Platform Filtrele'
                                    value={filterPlatform}
                                    onChange={e => setFilterPlatform(e.target.value)}
                                    sx={{ minWidth: 160 }}
                                >
                                    <MenuItem value=''>Tümü</MenuItem>
                                    {PLATFORMLAR.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                                </TextField>
                            }
                        />
                        <Divider />
                        <div className='overflow-x-auto'>
                            <table className={tableStyles.table}>
                                <thead>
                                    <tr>
                                        <th>Platform</th>
                                        <th>Kaynak</th>
                                        <th>Marka</th>
                                        <th>Kural Tipi</th>
                                        <th>Değer</th>
                                        <th>Açıklama</th>
                                        <th>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredKurallar.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className='text-center py-4'>
                                                <Typography variant='body2' color='text.secondary'>
                                                    {filterPlatform ? 'Bu platforma ait kural bulunamadı' : 'Henüz kural eklenmemiş'}
                                                </Typography>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredKurallar.map(k => (
                                            <tr key={k.id}>
                                                <td>
                                                    <Chip
                                                        label={PLATFORMLAR.find(p => p.value === k.platform)?.label || k.platform}
                                                        size='small'
                                                        color={PLATFORM_RENK[k.platform]}
                                                        variant='tonal'
                                                    />
                                                </td>
                                                <td>
                                                    <Typography variant='body2'>
                                                        {k.source ? (sources.find(s => s.code === k.source)?.name || k.source) : 'Tüm Kaynaklar'}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <Typography variant='body2'>{k.marka || 'Tüm Markalar'}</Typography>
                                                </td>
                                                <td>
                                                    <Typography variant='body2'>
                                                        {KURAL_TIPLERI.find(t => t.value === k.tip)?.label}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <Typography variant='body2' fontWeight='bold'>
                                                        {k.tip.startsWith('yuzde') ? `%${k.deger}` : `${k.deger} TL`}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <Typography variant='body2' color='text.secondary'>
                                                        {k.aciklama || '-'}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <IconButton size='small' color='error' onClick={() => handleKuralSil(k.id)}>
                                                        <i className='ri-delete-bin-line text-[18px]' />
                                                    </IconButton>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </Grid>
            </Grid>
        </>
    )
}

export default XmlPricingTable