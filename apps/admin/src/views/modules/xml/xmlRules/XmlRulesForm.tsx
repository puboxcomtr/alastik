'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import OutlinedInput from '@mui/material/OutlinedInput'
import ListItemText from '@mui/material/ListItemText'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Bizim standart hedef alanlarımız
const TARGET_FIELDS = [
    { key: '', label: '-- Eşleştirme Yok --' },
    { key: 'stokKodu', label: 'Stok Kodu' },
    { key: 'urunAdi', label: 'Ürün Adı' },
    { key: 'marka', label: 'Marka' },
    { key: 'hamFiyat', label: 'Ham Fiyat' },
    { key: 'stokAdeti', label: 'Stok Adeti' },
    { key: 'gorselUrl', label: 'Görsel URL' },
    { key: 'mevsim', label: 'Mevsim' },
    { key: 'uretimYili', label: 'Üretim Yılı' },
    { key: 'kategori', label: 'Kategori' },
    { key: 'aciklama', label: 'Açıklama' },
    { key: 'barkod', label: 'Barkod' },
    { key: 'genislik', label: 'Genişlik' },
    { key: 'kesit', label: 'Kesit' },
    { key: 'jant', label: 'Jant' },
    { key: 'yukIndeksi', label: 'Yük İndeksi' },
    { key: 'hizIndeksi', label: 'Hız İndeksi' },
    { key: 'runFlat', label: 'Run Flat' },
    { key: 'kdvOrani', label: 'KDV Oranı' },
]

type SourceField = { key: string; example: string }
type FieldMapping = { source: string; target: string }

type XmlDataType = {
    id: string
    name: string
    code: string
    rules?: {
        fieldMappings?: FieldMapping[]
        excludedCategories?: string[]
        excludedBrands?: string[]
        excludedYears?: string[]
        minStock?: number
        filters?: {
            onlyInStock?: boolean
            onlyWithImage?: boolean
            onlyWithPrice?: boolean
        }
    }
}

type Props = { xmlData: XmlDataType }

const XmlRulesForm = ({ xmlData }: Props) => {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [loadingFields, setLoadingFields] = useState(true)

    // Kaynak alanlar (XML'den otomatik çekilir)
    const [sourceFields, setSourceFields] = useState<SourceField[]>([])

    // Alan eşleştirmeleri
    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(
        xmlData.rules?.fieldMappings || []
    )

    // Filtreler
    const [availableCategories, setAvailableCategories] = useState<string[]>([])
    const [availableBrands, setAvailableBrands] = useState<string[]>([])
    const [availableYears, setAvailableYears] = useState<string[]>([])
    const [excludedCategories, setExcludedCategories] = useState<string[]>(xmlData.rules?.excludedCategories || [])
    const [excludedBrands, setExcludedBrands] = useState<string[]>(xmlData.rules?.excludedBrands || [])
    const [excludedYears, setExcludedYears] = useState<string[]>(xmlData.rules?.excludedYears || [])
    const [minStock, setMinStock] = useState<number>(xmlData.rules?.minStock || 0)
    const [filters, setFilters] = useState({
        onlyInStock: xmlData.rules?.filters?.onlyInStock || false,
        onlyWithImage: xmlData.rules?.filters?.onlyWithImage || false,
        onlyWithPrice: xmlData.rules?.filters?.onlyWithPrice || false
    })

    useEffect(() => {
        const loadData = async () => {
            try {
                const [sourceRes, filterRes] = await Promise.all([
                    fetchAPI(API_ENDPOINTS.webxml.getSourceFields(xmlData.id)),
                    fetchAPI(API_ENDPOINTS.webxml.getFilterOptions(xmlData.id))
                ])

                if (sourceRes.success) {
                    const fields: SourceField[] = sourceRes.data.fields
                    setSourceFields(fields)

                    // Mevcut mapping yoksa boş başlat
                    if (!xmlData.rules?.fieldMappings?.length) {
                        setFieldMappings(fields.map(f => ({ source: f.key, target: '' })))
                    } else {
                        // Yeni gelen alanları mevcut mapping'e ekle
                        const existingMap = new Map(xmlData.rules.fieldMappings.map(m => [m.source, m.target]))
                        setFieldMappings(fields.map(f => ({ source: f.key, target: existingMap.get(f.key) || '' })))
                    }
                } else {
                    toast.error('Kaynak alanlar yüklenemedi: ' + sourceRes.message)
                }

                if (filterRes.success) {
                    setAvailableCategories(filterRes.data.categories || [])
                    setAvailableBrands(filterRes.data.brands || [])
                    setAvailableYears(filterRes.data.years || [])
                }
            } catch (err) {
                toast.error('Veriler yüklenirken hata oluştu')
            } finally {
                setLoadingFields(false)
            }
        }
        loadData()
    }, [xmlData.id])

    const handleMappingChange = (sourceKey: string, targetKey: string) => {
        setFieldMappings(prev =>
            prev.map(m => m.source === sourceKey ? { ...m, target: targetKey } : m)
        )
    }

    const getMappedTarget = (sourceKey: string) =>
        fieldMappings.find(m => m.source === sourceKey)?.target || ''

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const response = await fetchAPI(API_ENDPOINTS.webxml.updateRules(xmlData.id), {
                method: 'PUT',
                body: JSON.stringify({
                    rules: {
                        fieldMappings: fieldMappings.filter(m => m.target),
                        excludedCategories,
                        excludedBrands,
                        excludedYears,
                        minStock,
                        filters
                    }
                })
            })
            if (response.success) {
                toast.success('Kurallar kaydedildi')
            } else {
                toast.error(response.message || 'Kayıt başarısız')
            }
        } catch {
            toast.error('Kurallar kaydedilirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Grid container spacing={6} className='flex items-center justify-center'>
            <Grid item xs={12} md={10}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant='h4'>{xmlData.name} — Kurallar ve Eşleştirme</Typography>
                </Box>
                <Divider sx={{ mb: 4 }} />

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={4}>

                        {/* Filtreler */}
                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader title='Kategori Filtrele' />
                                <CardContent>
                                    <FormControl fullWidth>
                                        <InputLabel>Hariç Tutulan Kategoriler</InputLabel>
                                        <Select
                                            multiple
                                            value={excludedCategories}
                                            onChange={(e) => setExcludedCategories(e.target.value as string[])}
                                            input={<OutlinedInput label='Hariç Tutulan Kategoriler' />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map(v => <Chip key={v} label={v} size='small' color='error' />)}
                                                </Box>
                                            )}
                                        >
                                            {availableCategories.map(cat => (
                                                <MenuItem key={cat} value={cat}>
                                                    <Checkbox checked={excludedCategories.includes(cat)} />
                                                    <ListItemText primary={cat} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader title='Marka Filtrele' />
                                <CardContent>
                                    <FormControl fullWidth>
                                        <InputLabel>Hariç Tutulan Markalar</InputLabel>
                                        <Select
                                            multiple
                                            value={excludedBrands}
                                            onChange={(e) => setExcludedBrands(e.target.value as string[])}
                                            input={<OutlinedInput label='Hariç Tutulan Markalar' />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map(v => <Chip key={v} label={v} size='small' color='error' />)}
                                                </Box>
                                            )}
                                        >
                                            {availableBrands.map(brand => (
                                                <MenuItem key={brand} value={brand}>
                                                    <Checkbox checked={excludedBrands.includes(brand)} />
                                                    <ListItemText primary={brand} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader title='Yıl Filtrele' />
                                <CardContent>
                                    <FormControl fullWidth>
                                        <InputLabel>Hariç Tutulan Yıllar</InputLabel>
                                        <Select
                                            multiple
                                            value={excludedYears}
                                            onChange={(e) => setExcludedYears(e.target.value as string[])}
                                            input={<OutlinedInput label='Hariç Tutulan Yıllar' />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map(v => <Chip key={v} label={v} size='small' color='error' />)}
                                                </Box>
                                            )}
                                        >
                                            {availableYears.map(year => (
                                                <MenuItem key={year} value={year}>
                                                    <Checkbox checked={excludedYears.includes(String(year))} />
                                                    <ListItemText primary={year} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader title='Minimum Stok' />
                                <CardContent>
                                    <TextField
                                        fullWidth
                                        type='number'
                                        value={minStock}
                                        onChange={(e) => setMinStock(Number(e.target.value))}
                                        inputProps={{ min: 0 }}
                                        helperText='Bu değerin altındaki ürünler dahil edilmez'
                                        size='small'
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader title='Diğer Filtreler' />
                                <CardContent>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <FormControlLabel
                                            control={<Checkbox checked={filters.onlyInStock} onChange={(e) => setFilters(p => ({ ...p, onlyInStock: e.target.checked }))} />}
                                            label='Sadece Stokta Olan Ürünler'
                                        />
                                        <FormControlLabel
                                            control={<Checkbox checked={filters.onlyWithImage} onChange={(e) => setFilters(p => ({ ...p, onlyWithImage: e.target.checked }))} />}
                                            label='Sadece Görseli Olan Ürünler'
                                        />
                                        <FormControlLabel
                                            control={<Checkbox checked={filters.onlyWithPrice} onChange={(e) => setFilters(p => ({ ...p, onlyWithPrice: e.target.checked }))} />}
                                            label='Sadece Fiyatı Olan Ürünler'
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Alan Eşleştirme */}
                        <Grid item xs={12}>
                            <Card>
                                <CardHeader
                                    title='Alan Eşleştirme'
                                    subheader='XML kaynak alanlarını standart alanlara eşleştirin. Eşleştirilmeyen alanlar çıktıya dahil edilmez.'
                                    action={
                                        loadingFields
                                            ? <CircularProgress size={20} sx={{ mr: 2, mt: 1 }} />
                                            : <Chip label={`${sourceFields.length} alan`} size='small' color='info' sx={{ mr: 2, mt: 1 }} />
                                    }
                                />
                                <CardContent>
                                    {loadingFields ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                            <CircularProgress size={32} />
                                            <Typography sx={{ ml: 2 }}>XML'den alanlar çekiliyor...</Typography>
                                        </Box>
                                    ) : sourceFields.length === 0 ? (
                                        <Typography color='text.secondary' sx={{ py: 4, textAlign: 'center' }}>
                                            XML kaynağından alan çekilemedi. URL ve credentials'ı kontrol edin.
                                        </Typography>
                                    ) : (
                                        <TableContainer component={Paper} variant='outlined'>
                                            <Table size='small'>
                                                <TableHead>
                                                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                                        <TableCell sx={{ fontWeight: 600, width: '35%' }}>Kaynak Alan</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, width: '30%' }}>Örnek Değer</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, width: '25%' }}>Hedef Alan</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, width: '10%' }}>Durum</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {sourceFields.map(field => {
                                                        const mapped = getMappedTarget(field.key)
                                                        return (
                                                            <TableRow key={field.key} hover>
                                                                <TableCell>
                                                                    <Typography variant='body2' fontWeight={500}>{field.key}</Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant='caption' sx={{
                                                                        backgroundColor: 'action.hover',
                                                                        px: 1, py: 0.5, borderRadius: 1,
                                                                        display: 'inline-block',
                                                                        maxWidth: 220,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}>
                                                                        {field.example || '-'}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <FormControl fullWidth size='small'>
                                                                        <Select
                                                                            value={mapped}
                                                                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                                            displayEmpty
                                                                        >
                                                                            {TARGET_FIELDS.map(tf => (
                                                                                <MenuItem key={tf.key} value={tf.key}>
                                                                                    {tf.label}
                                                                                </MenuItem>
                                                                            ))}
                                                                        </Select>
                                                                    </FormControl>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        size='small'
                                                                        label={mapped ? 'Eşleşti' : 'Boş'}
                                                                        color={mapped ? 'success' : 'default'}
                                                                        variant={mapped ? 'filled' : 'outlined'}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Kaydet */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button
                                    variant='outlined'
                                    color='secondary'
                                    onClick={() => router.push('/tr/apps/modules/xml')}
                                    disabled={saving}
                                    size='large'
                                >
                                    Geri
                                </Button>
                                <Button
                                    variant='contained'
                                    type='submit'
                                    disabled={saving || loadingFields}
                                    size='large'
                                    startIcon={saving ? <CircularProgress size={20} color='inherit' /> : null}
                                >
                                    {saving ? 'Kaydediliyor...' : 'Kuralları Kaydet'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </Grid>
        </Grid>
    )
}

export default XmlRulesForm