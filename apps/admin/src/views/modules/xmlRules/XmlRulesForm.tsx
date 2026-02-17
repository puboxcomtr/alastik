'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

// MUI Imports
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
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

// API
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Entegrasyon bazlı kaynak alanları
const SOURCE_FIELDS_MAP: Record<string, Array<{ key: string; label: string; example: string }>> = {
    mollaoglu: [
        { key: 'ProductID', label: 'Ürün ID', example: '51351' },
        { key: 'ProductName', label: 'Ürün Adı', example: '235/60R18 103H ContiCrossContact...' },
        { key: 'ProductCode', label: 'Ürün Kodu', example: '354327-21' },
        { key: 'ProductShortCode', label: 'Kısa Kod', example: '235/60R18 103H' },
        { key: 'ProductDescription', label: 'Açıklama', example: 'Continental 235/60R18...' },
        { key: 'BrandName', label: 'Marka', example: 'Continental' },
        { key: 'CategoryCode', label: 'Kategori', example: '4X4 SUV Lastikleri' },
        { key: 'StockNumberSort', label: 'Stok Adedi', example: '4' },
        { key: 'RetailPrice', label: 'Satış Fiyatı', example: '6.230,69' },
        { key: 'Price', label: 'Fiyat', example: '6.230,69' },
        { key: 'TaxRatio', label: 'KDV Oranı', example: '20' },
        { key: 'ImageUrl', label: 'Görsel URL', example: 'https://images...' },
        { key: 'Season', label: 'Mevsim', example: '0/1/2' },
        { key: 'Field1', label: 'XL Bilgisi', example: 'XL' },
        { key: 'Field2', label: 'Yük İndeksi', example: '103' },
        { key: 'Field3', label: 'Hız İndeksi', example: 'H' },
        { key: 'Field4', label: 'Genişlik', example: '235' },
        { key: 'Field5', label: 'Kesit', example: '60' },
        { key: 'Field6', label: 'Jant', example: '18' },
        { key: 'RunFlat', label: 'Run Flat', example: '0/1' },
        { key: 'Consumption', label: 'Yakıt Verimliliği', example: 'A-G' },
        { key: 'Lubricity', label: 'Islak Tutuş', example: 'A-G' },
        { key: 'NoiseLevel', label: 'Gürültü Seviyesi', example: '71' },
        { key: 'ProductionDate', label: 'Üretim Yılı', example: '2021' },
        { key: 'FriendlyUrl', label: 'SEO URL', example: '/235/60r18-103h-...' },
        { key: 'OEM', label: 'OEM Kodu', example: '2356018 103H' }
    ],
    tatko: [
        { key: 'stokkodu', label: 'Stok Kodu', example: 'LSS-BN-00212702-25' },
        { key: 'markaismi', label: 'Marka', example: 'Lassa' },
        { key: 'desen', label: 'Desen', example: '275/45R20 110Y XL Competus H/P 3' },
        { key: 'dot', label: 'DOT (Üretim Yılı)', example: '2025' },
        { key: 'mevsim', label: 'Mevsim', example: 'YAZ' },
        { key: 'Oem', label: 'OEM Kodu', example: '212702' },
        { key: 'kdvdahilfiyat', label: 'KDV Dahil Fiyat', example: '8500' },
        { key: 'kampanya', label: 'Kampanya', example: '' },
        { key: 'miktar', label: 'Stok Miktarı', example: '40' },
        { key: 'depoAdi', label: 'Depo Adı', example: '' },
        { key: 'stokanagrup', label: 'Ana Grup', example: '' },
        { key: 'desenresim', label: 'Desen Resim', example: '1f9512d8...jpg' }
    ]
}


type XmlDataType = {
    id: string
    name: string
    code: string
    rules?: {
        fieldMappings?: Array<{ source: string; target: string }>
        excludedCategories?: string[]
        excludedBrands?: string[]
        excludedYears?: string[]
        minStock?: number
        filters?: {
            onlyInStock?: boolean
            onlyActive?: boolean
            onlyWithImage?: boolean
            onlyWithPrice?: boolean
        }
    }
}

type Props = {
    xmlData: XmlDataType
}

const XmlRulesForm = ({ xmlData }: Props) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(true)

    // Kategoriler ve markalar (xmlproducts'tan çekilecek)
    const [availableCategories, setAvailableCategories] = useState<string[]>([])
    const [availableBrands, setAvailableBrands] = useState<string[]>([])

    const [availableYears, setAvailableYears] = useState<string[]>([])
    const [excludedYears, setExcludedYears] = useState<string[]>(
        xmlData.rules?.excludedYears || []
    )
    const [targetFields, setTargetFields] = useState<Array<{ key: string; label: string }>>([])

    // Form state
    const sourceFields = SOURCE_FIELDS_MAP[xmlData.code] || SOURCE_FIELDS_MAP.mollaoglu
    const [fieldMappings, setFieldMappings] = useState<Array<{ source: string; target: string }>>(() => {
        return sourceFields.map(f => {
            const existing = xmlData.rules?.fieldMappings?.find(m => m.source === f.key)
            return { source: f.key, target: existing?.target || '' }
        })
    })
    const [excludedCategories, setExcludedCategories] = useState<string[]>(
        xmlData.rules?.excludedCategories || []
    )
    const [excludedBrands, setExcludedBrands] = useState<string[]>(
        xmlData.rules?.excludedBrands || []
    )
    const [minStock, setMinStock] = useState<number>(xmlData.rules?.minStock || 0)
    const [filters, setFilters] = useState({
        onlyInStock: xmlData.rules?.filters?.onlyInStock || false,
        onlyActive: xmlData.rules?.filters?.onlyActive || false,
        onlyWithImage: xmlData.rules?.filters?.onlyWithImage || false,
        onlyWithPrice: xmlData.rules?.filters?.onlyWithPrice || false
    })

    // Kategorileri ve markaları yükle
    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [filtersRes, diaFieldsRes] = await Promise.all([
                    fetchAPI(API_ENDPOINTS.webxml.getFilterOptions(xmlData.id)),
                    fetchAPI(API_ENDPOINTS.webxml.getDiaFields())
                ])

                if (filtersRes.success) {
                    setAvailableCategories(filtersRes.data.categories || [])
                    setAvailableBrands(filtersRes.data.brands || [])
                    setAvailableYears(filtersRes.data.years || [])
                }

                if (diaFieldsRes.success) {
                    setTargetFields(diaFieldsRes.data.fields || [])
                }
            } catch (err) {
                console.error('Veriler yüklenemedi:', err)
            } finally {
                setLoadingData(false)
            }
        }
        fetchFiltersData()
    }, [xmlData.id])

    // Mapping değiştir
    const handleMappingChange = (sourceKey: string, targetKey: string) => {
        setFieldMappings(prev =>
            prev.map(m => m.source === sourceKey ? { ...m, target: targetKey } : m)
        )
    }

    // Kaydet
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const rulesData = {
                fieldMappings: fieldMappings.filter(m => m.target),
                excludedCategories,
                excludedBrands,
                excludedYears,
                minStock,
                filters
            }

            await fetchAPI(API_ENDPOINTS.webxml.updateRules(xmlData.id), {
                method: 'PUT',
                body: JSON.stringify({ rules: rulesData })
            })

            toast.success('Kurallar başarıyla kaydedildi')
        } catch (err: any) {
            toast.error(err.message || 'Kurallar kaydedilirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (

        <Grid container spacing={6} className='flex items-center justify-center'>
            <Grid item xs={12} md={9}>
                {/* Başlık */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                            <Typography variant='h4'>{xmlData.name} - Kurallar ve Eşleştirme</Typography>
                        </Box>
                    </Box>
                    <Divider className='my-4' />

                </Grid>
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <Grid container spacing={6} sx={{ px: 3 }}>
                        {/* Filtreleme */}
                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader
                                    title='Kategori Filtreleme'
                                />
                                <CardContent>
                                    {loadingData ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : (
                                        <FormControl fullWidth>
                                            <InputLabel>Hariç Tutulan Kategoriler</InputLabel>
                                            <Select
                                                multiple
                                                value={excludedCategories}
                                                onChange={(e) => setExcludedCategories(e.target.value as string[])}
                                                input={<OutlinedInput label='Hariç Tutulan Kategoriler' />}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((value) => (
                                                            <Chip key={value} label={value} size='small' color='error' />
                                                        ))}
                                                    </Box>
                                                )}
                                            >
                                                {availableCategories.map((cat) => (
                                                    <MenuItem key={cat} value={cat}>
                                                        <Checkbox checked={excludedCategories.includes(cat)} />
                                                        <ListItemText primary={cat} />
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader
                                    title='Marka Filtreleme'
                                />
                                <CardContent>
                                    {loadingData ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : (
                                        <FormControl fullWidth>
                                            <InputLabel>Hariç Tutulan Markalar</InputLabel>
                                            <Select
                                                multiple
                                                value={excludedBrands}
                                                onChange={(e) => setExcludedBrands(e.target.value as string[])}
                                                input={<OutlinedInput label='Hariç Tutulan Markalar' />}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((value) => (
                                                            <Chip key={value} label={value} size='small' color='error' />
                                                        ))}
                                                    </Box>
                                                )}
                                            >
                                                {availableBrands.map((brand) => (
                                                    <MenuItem key={brand} value={brand}>
                                                        <Checkbox checked={excludedBrands.includes(brand)} />
                                                        <ListItemText primary={brand} />
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader title='Yıl Filtreleme' />
                                <CardContent>
                                    {loadingData ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : (
                                        <FormControl fullWidth>
                                            <InputLabel>Hariç Tutulan Yıllar</InputLabel>
                                            <Select
                                                multiple
                                                value={excludedYears}
                                                onChange={(e) => setExcludedYears(e.target.value as string[])}
                                                input={<OutlinedInput label='Hariç Tutulan Yıllar' />}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((value) => (
                                                            <Chip key={value} label={value} size='small' color='error' />
                                                        ))}
                                                    </Box>
                                                )}
                                            >
                                                {availableYears.map((year) => (
                                                    <MenuItem key={year} value={year}>
                                                        <Checkbox checked={excludedYears.includes(year)} />
                                                        <ListItemText primary={year} />
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Stok ve Diğer Filtreler */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader
                                    title='Stok Filtreleme'
                                />
                                <CardContent>
                                    <TextField
                                        fullWidth
                                        type='number'
                                        value={minStock}
                                        onChange={(e) => setMinStock(Number(e.target.value))}
                                        inputProps={{ min: 0 }}
                                        helperText='Bu değerin altındaki ürünler aktarılmayacak'
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardHeader
                                    title='Diğer Filtreler'
                                    subheader='Ek filtreleme seçenekleri'
                                />
                                <CardContent>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={filters.onlyInStock}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        onlyInStock: e.target.checked
                                                    }))}
                                                />
                                            }
                                            label='Sadece Stokta Olan Ürünleri Kullan'
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={filters.onlyActive}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        onlyActive: e.target.checked
                                                    }))}
                                                />
                                            }
                                            label='Sadece Aktif Olan Ürünleri Kullan'
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={filters.onlyWithImage}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        onlyWithImage: e.target.checked
                                                    }))}
                                                />
                                            }
                                            label='Sadece Resmi Olan Ürünleri Kullan'
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={filters.onlyWithPrice}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        onlyWithPrice: e.target.checked
                                                    }))}
                                                />
                                            }
                                            label='Sadece Fiyatı Olan Ürünleri Kullan'
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
                                    subheader='Kaynak alanları hedef alanlara eşleştirin'
                                />
                                <CardContent>
                                    <TableContainer component={Paper} variant='outlined'>
                                        <Table size='small'>
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                                    <TableCell sx={{ fontWeight: 600, width: '30%' }}>Kaynak Alan</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, width: '25%' }}>Örnek Değer</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, width: '35%' }}>Hedef Alan</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, width: '10%' }}>Durum</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sourceFields.map((field) => {
                                                    const mapping = fieldMappings.find(m => m.source === field.key)
                                                    const hasMapping = mapping && mapping.target
                                                    return (
                                                        <TableRow key={field.key} hover>
                                                            <TableCell>
                                                                <Box>
                                                                    <Typography variant='body2' fontWeight={500}>
                                                                        {field.label}
                                                                    </Typography>
                                                                    <Typography variant='caption' color='text.secondary'>
                                                                        {field.key}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant='caption' sx={{
                                                                    backgroundColor: 'action.hover',
                                                                    px: 1,
                                                                    py: 0.5,
                                                                    borderRadius: 1,
                                                                    display: 'inline-block',
                                                                    maxWidth: 200,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {field.example}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormControl fullWidth size='small'>
                                                                    <Select
                                                                        value={mapping?.target || ''}
                                                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                                        displayEmpty
                                                                    >
                                                                        {targetFields.map(tf => (
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
                                                                    label={hasMapping ? 'Eşleşti' : 'Boş'}
                                                                    color={hasMapping ? 'success' : 'default'}
                                                                    variant={hasMapping ? 'filled' : 'outlined'}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Kaydet Butonu */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'end', gap: 4, mt: 2 }}>
                                <Button
                                    variant='contained'
                                    type='submit'
                                    disabled={loading}
                                    size='large'
                                    startIcon={loading ? <CircularProgress size={20} /> : null}
                                >
                                    {loading ? 'Kaydediliyor...' : 'Kuralları Kaydet'}
                                </Button>
                                <Button
                                    variant='outlined'
                                    color='secondary'
                                    onClick={() => router.push('/apps/modules/xml')}
                                    disabled={loading}
                                    size='large'
                                >
                                    İptal
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