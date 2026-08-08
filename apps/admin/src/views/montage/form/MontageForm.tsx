'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Rating from '@mui/material/Rating'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'

type City = { cityId: string; cityName: string }
type District = { districtId: string; districtName: string }
type Review = {
    memberName: string
    comment: string
    processRating: number
    locationRating: number
    createdAt?: string
}
type ServiceProduct = { productKey: string; sku: string; name: string; defaultPrice: number }
type ServiceItem = ServiceProduct & { price: number | null; priceText: string }
type MontageDocument = { name: string; url: string; originalName: string; uploadedAt?: string }

// Fiyat girişini xxx.xxx,xx biçimine maskeler (binlik nokta, ondalık virgül)
const formatPriceInput = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '')
    const parts = cleaned.split(',')
    let intPart = parts[0].replace(/^0+(?=\d)/, '').slice(0, 9)
    const hasDecimal = parts.length > 1
    const decPart = hasDecimal ? parts.slice(1).join('').slice(0, 2) : ''

    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    return hasDecimal ? `${grouped},${decPart}` : grouped
}

const parsePrice = (formatted: string): number | null => {
    if (!formatted) return null

    const value = Number(formatted.replace(/\./g, '').replace(',', '.'))

    return Number.isNaN(value) ? null : value
}

const priceToText = (price: number | null) =>
    price === null || price === undefined
        ? ''
        : price.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
type DaySchedule = { open: string; close: string }
type WeekSchedule = Record<string, DaySchedule>

// Günler: anahtarlar İngilizce saklanır, etiketler Türkçe gösterilir
const WEEK_DAYS: { value: string; label: string }[] = [
    { value: 'monday', label: 'Pazartesi' },
    { value: 'tuesday', label: 'Salı' },
    { value: 'wednesday', label: 'Çarşamba' },
    { value: 'thursday', label: 'Perşembe' },
    { value: 'friday', label: 'Cuma' },
    { value: 'saturday', label: 'Cumartesi' },
    { value: 'sunday', label: 'Pazar' }
]

const emptySchedule = (): WeekSchedule =>
    WEEK_DAYS.reduce((acc, d) => ({ ...acc, [d.value]: { open: '', close: '' } }), {})

// Telefon maskesi: +90 xxx xxx xx xx
const formatPhone = (value: string) => {
    let digits = value.replace(/\D/g, '')

    // Başta 90 ve/veya 0'lar varsa ulusal numaradan ayıkla
    digits = digits.replace(/^0+/, '')
    if (digits.startsWith('90')) digits = digits.slice(2)
    digits = digits.replace(/^0+/, '')
    digits = digits.slice(0, 10)

    if (!digits) return ''

    let formatted = `+90 ${digits.slice(0, 3)}`

    if (digits.length > 3) formatted += ` ${digits.slice(3, 6)}`
    if (digits.length > 6) formatted += ` ${digits.slice(6, 8)}`
    if (digits.length > 8) formatted += ` ${digits.slice(8, 10)}`

    return formatted
}

// Standart çalışma saatleri: Pazartesi-Cumartesi 09:00-20:00, Pazar kapalı
const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '20:00'

const standardSchedule = (): WeekSchedule =>
    WEEK_DAYS.reduce(
        (acc, d) => ({
            ...acc,
            [d.value]: d.value === 'sunday' ? { open: '', close: '' } : { open: DEFAULT_OPEN, close: DEFAULT_CLOSE }
        }),
        {}
    )

// Olanaklar: anahtarlar İngilizce saklanır, etiketler Türkçe gösterilir
const AMENITY_OPTIONS = [
    { value: 'wc', label: 'WC (Kadın/Erkek)' },
    { value: 'waiting_room', label: 'Bekleme Salonu' },
    { value: 'wifi', label: 'WiFi' },
    { value: 'air_conditioning', label: 'Klima' },
    { value: 'refreshments', label: 'İkram' },
    { value: 'oil_change', label: 'Yağ Değişimi' },
    { value: 'headlight_check', label: 'Far Kontrol' }
]

interface MontageFormProps {
    montageId?: string
}

const MontageForm = ({ montageId }: MontageFormProps) => {
    const router = useRouter()
    const { lang: locale } = useParams()

    const [loading, setLoading] = useState(!!montageId)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    // İl / ilçe listeleri (adres veritabanından)
    const [cities, setCities] = useState<City[]>([])
    const [districts, setDistricts] = useState<District[]>([])

    // Form alanları
    const [name, setName] = useState('')
    const [cityId, setCityId] = useState('')
    const [districtId, setDistrictId] = useState('')
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [workingSchedule, setWorkingSchedule] = useState<WeekSchedule>(emptySchedule())
    const [order, setOrder] = useState(0)
    const [isActive, setIsActive] = useState(true)
    const [services, setServices] = useState<ServiceItem[]>([])
    const [serviceProducts, setServiceProducts] = useState<ServiceProduct[]>([])
    const [amenities, setAmenities] = useState<string[]>([])
    const [image, setImage] = useState('')
    const [documents, setDocuments] = useState<MontageDocument[]>([])
    const [uploadingDocument, setUploadingDocument] = useState(false)
    const [reviews, setReviews] = useState<Review[]>([])

    useEffect(() => {
        const loadCities = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.location.cities())

                if (res.success) setCities(res.data || [])
            } catch (error) {
                console.error('İller yüklenemedi:', error)
            }
        }

        loadCities()
    }, [])

    // Hizmetlerimiz kategorisindeki ürünler (hizmet seçimi için)
    useEffect(() => {
        const loadServiceProducts = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.montage.serviceProducts())

                if (res.success) setServiceProducts(res.data || [])
            } catch (error) {
                console.error('Hizmet ürünleri yüklenemedi:', error)
            }
        }

        loadServiceProducts()
    }, [])

    useEffect(() => {
        if (!cityId) {
            setDistricts([])

            return
        }

        const loadDistricts = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.location.districts(cityId))

                if (res.success) setDistricts(res.data || [])
            } catch (error) {
                console.error('İlçeler yüklenemedi:', error)
            }
        }

        loadDistricts()
    }, [cityId])

    useEffect(() => {
        if (!montageId) return

        const loadPoint = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.montage.detail(montageId))

                if (res.success && res.data) {
                    const p = res.data

                    setName(p.name || '')
                    setCityId(p.cityId || '')
                    setDistrictId(p.districtId || '')
                    setAddress(p.address || '')
                    setPhone(formatPhone(p.phone || ''))
                    setWorkingSchedule({ ...emptySchedule(), ...(p.workingSchedule || {}) })
                    setOrder(p.order || 0)
                    setIsActive(p.isActive !== false)
                    setServices(
                        (p.services || []).map((s: ServiceItem) => ({ ...s, priceText: priceToText(s.price) }))
                    )
                    setAmenities(p.amenities || [])
                    setImage(p.image || '')
                    setDocuments(p.documents || [])
                    setReviews(p.reviews || [])
                } else {
                    toast.error('Montaj noktası bulunamadı')
                }
            } catch (error) {
                toast.error('Montaj noktası yüklenemedi')
            } finally {
                setLoading(false)
            }
        }

        loadPoint()
    }, [montageId])

    const addService = (product: ServiceProduct | null) => {
        if (!product) return

        if (services.some(s => s.productKey === product.productKey)) {
            toast.warning('Bu hizmet zaten ekli')

            return
        }

        // price null: ürünün varsayılan fiyatı geçerli; manuel girilirse o geçerli olur
        setServices([...services, { ...product, price: null, priceText: '' }])
    }

    const toggleAmenity = (value: string) => {
        setAmenities(prev => (prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]))
    }

    const handleImageUpload = async (file: File) => {
        setUploading(true)

        try {
            const formData = new FormData()

            formData.append('image', file)

            const res = await fetchAPI(API_ENDPOINTS.montage.upload(), {
                method: 'POST',
                body: formData
            })

            if (res.success) {
                setImage(res.data.url)
                toast.success('Görsel yüklendi')
            } else {
                toast.error(res.message || 'Görsel yüklenemedi')
            }
        } catch (error) {
            toast.error('Görsel yüklenirken hata oluştu')
        } finally {
            setUploading(false)
        }
    }

    // Sözleşme/evrak dosyası yükler; ad alanı dosya adıyla başlar, sonradan düzenlenebilir
    const handleDocumentUpload = async (file: File) => {
        setUploadingDocument(true)

        try {
            const formData = new FormData()

            formData.append('document', file)

            const res = await fetchAPI(API_ENDPOINTS.montage.uploadDocument(), {
                method: 'POST',
                body: formData
            })

            if (res.success) {
                const originalName = res.data.originalName || file.name

                setDocuments(prev => [
                    ...prev,
                    { name: originalName.replace(/\.[^.]+$/, ''), url: res.data.url, originalName }
                ])
                toast.success('Evrak yüklendi')
            } else {
                toast.error(res.message || 'Evrak yüklenemedi')
            }
        } catch (error) {
            toast.error('Evrak yüklenirken hata oluştu')
        } finally {
            setUploadingDocument(false)
        }
    }

    // Evrak private dizinde tutulur; auth'lu endpoint'ten alınıp tarayıcıda açılır/indirilir
    const handleDocumentOpen = async (doc: MontageDocument) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.montage.documentFile(doc.url))

            if (!res.success) {
                toast.error(res.message || 'Evrak açılamadı')

                return
            }

            const binary = atob(res.data.base64)
            const bytes = new Uint8Array(binary.length)

            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

            const blob = new Blob([bytes], { type: res.data.mime })
            const url = URL.createObjectURL(blob)

            // PDF ve görseller tarayıcıda açılır, diğerleri indirilir
            if (/^(application\/pdf|image\/)/.test(res.data.mime)) {
                window.open(url, '_blank')
            } else {
                const link = document.createElement('a')

                link.href = url
                link.download = doc.originalName || res.data.filename
                link.click()
            }

            setTimeout(() => URL.revokeObjectURL(url), 60000)
        } catch (error) {
            toast.error('Evrak açılırken hata oluştu')
        }
    }

    const handleSave = async () => {
        const selectedCity = cities.find(c => c.cityId === cityId)

        if (!name.trim() || !selectedCity) {
            toast.error('Montaj noktası adı ve il alanları zorunludur')

            return
        }

        const selectedDistrict = districts.find(d => d.districtId === districtId)

        setSaving(true)

        try {
            const payload = {
                name,
                city: selectedCity.cityName,
                cityId,
                district: selectedDistrict?.districtName || '',
                districtId: districtId || '',
                address,
                phone,
                workingSchedule,
                order,
                isActive,
                services,
                amenities,
                image,
                documents,
                reviews
            }

            const url = montageId ? API_ENDPOINTS.montage.update(montageId) : API_ENDPOINTS.montage.create()
            const res = await fetchAPI(url, {
                method: montageId ? 'PUT' : 'POST',
                body: JSON.stringify(payload)
            })

            if (res.success) {
                toast.success(res.message)
                router.push(`/${locale}/apps/montage/list`)
            } else {
                toast.error(res.message || 'Kayıt başarısız')
            }
        } catch (error) {
            toast.error('Kayıt sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className='flex items-center justify-center gap-3' style={{ minHeight: '300px' }}>
                <CircularProgress size={28} />
                <Typography>Montaj noktası yükleniyor...</Typography>
            </div>
        )
    }

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 8 }}>
                <Card>
                    <CardHeader title={montageId ? 'Montaj Noktası Düzenle' : 'Yeni Montaj Noktası'} />
                    <Divider />
                    <CardContent className='flex flex-col gap-5'>
                        <TextField
                            fullWidth
                            size='small'
                            label='Montaj Noktası Adı *'
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <div className='flex gap-4'>
                            <Autocomplete
                                fullWidth
                                size='small'
                                options={cities}
                                getOptionLabel={c => c.cityName}
                                isOptionEqualToValue={(option, value) => option.cityId === value.cityId}
                                value={cities.find(c => c.cityId === cityId) || null}
                                onChange={(_, value) => {
                                    setCityId(value?.cityId || '')
                                    setDistrictId('')
                                }}
                                noOptionsText='Sonuç bulunamadı'
                                renderInput={params => <TextField {...params} label='İl *' />}
                            />
                            <Autocomplete
                                fullWidth
                                size='small'
                                options={districts}
                                getOptionLabel={d => d.districtName}
                                isOptionEqualToValue={(option, value) => option.districtId === value.districtId}
                                value={districts.find(d => d.districtId === districtId) || null}
                                onChange={(_, value) => setDistrictId(value?.districtId || '')}
                                disabled={!cityId}
                                noOptionsText='Sonuç bulunamadı'
                                renderInput={params => <TextField {...params} label='İlçe' />}
                            />
                        </div>
                        <TextField
                            fullWidth
                            size='small'
                            label='Adres'
                            multiline
                            minRows={2}
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            size='small'
                            label='Telefon'
                            placeholder='+90 xxx xxx xx xx'
                            value={phone}
                            onChange={e => setPhone(formatPhone(e.target.value))}
                        />

                        <Divider />

                        {/* Çalışma Saatleri */}
                        <div className='flex items-center justify-between'>
                            <Typography variant='h6'>Çalışma Saatleri</Typography>
                            <Button size='small' variant='outlined' onClick={() => setWorkingSchedule(standardSchedule())}>
                                Standart Çalışma Saatlerini Uyarla
                            </Button>
                        </div>
                        <Typography variant='body2' color='text.secondary'>
                            Standart: Pazartesi-Cumartesi {DEFAULT_OPEN} - {DEFAULT_CLOSE}, Pazar kapalı
                        </Typography>
                        <div className='flex flex-col gap-3'>
                            {WEEK_DAYS.map(day => {
                                const schedule = workingSchedule[day.value] || { open: '', close: '' }
                                const isOpen = Boolean(schedule.open || schedule.close)

                                return (
                                    <div key={day.value} className='flex items-center gap-4'>
                                        <Typography style={{ minWidth: 90 }}>{day.label}</Typography>
                                        <FormControlLabel
                                            style={{ minWidth: 110 }}
                                            control={
                                                <Switch
                                                    size='small'
                                                    checked={isOpen}
                                                    onChange={e =>
                                                        setWorkingSchedule({
                                                            ...workingSchedule,
                                                            [day.value]: e.target.checked
                                                                ? { open: DEFAULT_OPEN, close: DEFAULT_CLOSE }
                                                                : { open: '', close: '' }
                                                        })
                                                    }
                                                />
                                            }
                                            label={isOpen ? 'Açık' : 'Kapalı'}
                                        />
                                        {isOpen && (
                                            <>
                                                <TextField
                                                    size='small'
                                                    type='time'
                                                    label='Açılış'
                                                    InputLabelProps={{ shrink: true }}
                                                    value={schedule.open}
                                                    onChange={e =>
                                                        setWorkingSchedule({
                                                            ...workingSchedule,
                                                            [day.value]: { ...schedule, open: e.target.value }
                                                        })
                                                    }
                                                />
                                                <TextField
                                                    size='small'
                                                    type='time'
                                                    label='Kapanış'
                                                    InputLabelProps={{ shrink: true }}
                                                    value={schedule.close}
                                                    onChange={e =>
                                                        setWorkingSchedule({
                                                            ...workingSchedule,
                                                            [day.value]: { ...schedule, close: e.target.value }
                                                        })
                                                    }
                                                />
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <Divider />

                        {/* Alınabilecek Hizmetler — Hizmetlerimiz kategorisindeki ürünlerden */}
                        <Typography variant='h6'>Alınabilecek Hizmetler</Typography>
                        <Autocomplete
                            fullWidth
                            size='small'
                            options={serviceProducts.filter(p => !services.some(s => s.productKey === p.productKey))}
                            getOptionLabel={p => p.name}
                            value={null}
                            onChange={(_, value) => addService(value)}
                            noOptionsText='Hizmet ürünü bulunamadı'
                            renderOption={(props, option) => (
                                <li {...props} key={option.productKey}>
                                    <div className='flex justify-between items-center is-full gap-4'>
                                        <Typography variant='body2'>{option.name}</Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                            {option.defaultPrice > 0 ? `${option.defaultPrice.toLocaleString('tr-TR')} TL` : '-'}
                                        </Typography>
                                    </div>
                                </li>
                            )}
                            renderInput={params => (
                                <TextField {...params} label='Hizmet Ekle' placeholder='Hizmet adı veya stok kodu ile ara' />
                            )}
                        />
                        {services.length === 0 && (
                            <Typography variant='body2' color='text.secondary'>
                                Henüz hizmet eklenmemiş
                            </Typography>
                        )}
                        {services.map((service, i) => (
                            <div
                                key={service.productKey}
                                className='flex items-center gap-4 p-3 border rounded'
                                style={{ borderColor: 'var(--mui-palette-divider)' }}
                            >
                                <div className='flex flex-col flex-1'>
                                    <Typography className='font-medium' color='text.primary'>
                                        {service.name}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                        {service.sku} • Varsayılan fiyat:{' '}
                                        {service.defaultPrice > 0 ? `${service.defaultPrice.toLocaleString('tr-TR')} TL` : '-'}
                                    </Typography>
                                </div>
                                <TextField
                                    size='small'
                                    label='Fiyat (TL)'
                                    style={{ width: 140 }}
                                    placeholder={priceToText(service.defaultPrice) || '0'}
                                    value={service.priceText}
                                    onChange={e => {
                                        const priceText = formatPriceInput(e.target.value)

                                        setServices(
                                            services.map((s, idx) =>
                                                idx === i ? { ...s, priceText, price: parsePrice(priceText) } : s
                                            )
                                        )
                                    }}
                                />
                                <IconButton size='small' onClick={() => setServices(services.filter((_, idx) => idx !== i))}>
                                    <i className='ri-delete-bin-line' />
                                </IconButton>
                            </div>
                        ))}

                        <Divider />

                        {/* Olanaklar */}
                        <Typography variant='h6'>Olanaklar</Typography>
                        <FormGroup row>
                            {AMENITY_OPTIONS.map(opt => (
                                <FormControlLabel
                                    key={opt.value}
                                    control={
                                        <Checkbox
                                            checked={amenities.includes(opt.value)}
                                            onChange={() => toggleAmenity(opt.value)}
                                        />
                                    }
                                    label={opt.label}
                                />
                            ))}
                        </FormGroup>

                        <Divider />

                        {/* Yorumlar — panelden eklenenlerde üye "sistem" olarak geçer */}
                        <div className='flex items-center justify-between'>
                            <Typography variant='h6'>Yorumlar</Typography>
                            <Button
                                size='small'
                                variant='outlined'
                                startIcon={<i className='ri-add-line' />}
                                onClick={() =>
                                    setReviews([
                                        ...reviews,
                                        { memberName: 'sistem', comment: '', processRating: 5, locationRating: 5 }
                                    ])
                                }
                            >
                                Yorum Ekle
                            </Button>
                        </div>
                        {reviews.length === 0 && (
                            <Typography variant='body2' color='text.secondary'>
                                Henüz yorum eklenmemiş
                            </Typography>
                        )}
                        {reviews.map((review, i) => (
                            <div key={i} className='flex flex-col gap-3 p-4 border rounded' style={{ borderColor: 'var(--mui-palette-divider)' }}>
                                <div className='flex items-center justify-between gap-4'>
                                    <div className='flex items-center gap-2'>
                                        <Chip size='small' variant='tonal' color='info' label={`Üye: ${review.memberName || 'sistem'}`} />
                                        <Typography variant='body2' color='text.secondary'>
                                            {review.createdAt
                                                ? new Date(review.createdAt).toLocaleDateString('tr-TR', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })
                                                : 'Tarih kayıtta otomatik eklenecek'}
                                        </Typography>
                                    </div>
                                    <IconButton size='small' onClick={() => setReviews(reviews.filter((_, idx) => idx !== i))}>
                                        <i className='ri-delete-bin-line' />
                                    </IconButton>
                                </div>
                                <div className='flex flex-wrap items-center gap-6'>
                                    <div className='flex flex-col gap-1'>
                                        <Typography variant='body2'>Montaj Sürecinden Memnun musunuz?</Typography>
                                        <Rating
                                            value={review.processRating}
                                            onChange={(_, value) =>
                                                setReviews(
                                                    reviews.map((r, idx) =>
                                                        idx === i ? { ...r, processRating: value || 5 } : r
                                                    )
                                                )
                                            }
                                        />
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                        <Typography variant='body2'>Montaj Noktasından Memnun musunuz?</Typography>
                                        <Rating
                                            value={review.locationRating}
                                            onChange={(_, value) =>
                                                setReviews(
                                                    reviews.map((r, idx) =>
                                                        idx === i ? { ...r, locationRating: value || 5 } : r
                                                    )
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <TextField
                                    fullWidth
                                    size='small'
                                    label='Yorum'
                                    multiline
                                    minRows={2}
                                    value={review.comment}
                                    onChange={e =>
                                        setReviews(reviews.map((r, idx) => (idx === i ? { ...r, comment: e.target.value } : r)))
                                    }
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                    <CardHeader title='Görsel' />
                    <Divider />
                    <CardContent className='flex flex-col gap-4'>
                        {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={getImageUrl(image)}
                                alt='Montaj noktası görseli'
                                style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
                            />
                        ) : (
                            <Typography variant='body2' color='text.secondary'>
                                Henüz görsel yüklenmedi
                            </Typography>
                        )}
                        <div className='flex gap-3'>
                            <Button component='label' variant='outlined' fullWidth disabled={uploading}>
                                {uploading ? 'Yükleniyor...' : image ? 'Görseli Değiştir' : 'Görsel Yükle'}
                                <input
                                    hidden
                                    type='file'
                                    accept='image/jpeg,image/png,image/webp'
                                    onChange={e => {
                                        const file = e.target.files?.[0]

                                        if (file) handleImageUpload(file)
                                        e.target.value = ''
                                    }}
                                />
                            </Button>
                            {image && (
                                <Button variant='outlined' color='error' onClick={() => setImage('')}>
                                    Kaldır
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className='mbs-6'>
                    <CardHeader title='Sözleşme ve Evraklar' subheader='PDF, Word, Excel veya görsel (maks. 10MB)' />
                    <Divider />
                    <CardContent className='flex flex-col gap-4'>
                        {documents.length === 0 && (
                            <Typography variant='body2' color='text.secondary'>
                                Henüz evrak yüklenmedi
                            </Typography>
                        )}
                        {documents.map((doc, i) => (
                            <div key={i} className='flex flex-col gap-2 p-3 border rounded'>
                                <div className='flex items-center gap-2'>
                                    <i
                                        className={
                                            /\.pdf$/i.test(doc.url)
                                                ? 'ri-file-pdf-2-line text-error'
                                                : /\.(doc|docx)$/i.test(doc.url)
                                                    ? 'ri-file-word-2-line text-info'
                                                    : /\.(xls|xlsx)$/i.test(doc.url)
                                                        ? 'ri-file-excel-2-line text-success'
                                                        : /\.(jpg|jpeg|png|webp)$/i.test(doc.url)
                                                            ? 'ri-image-line'
                                                            : 'ri-file-3-line'
                                        }
                                        style={{ fontSize: 22 }}
                                    />
                                    <TextField
                                        fullWidth
                                        size='small'
                                        label='Evrak Adı'
                                        value={doc.name}
                                        onChange={e =>
                                            setDocuments(documents.map((d, idx) => (idx === i ? { ...d, name: e.target.value } : d)))
                                        }
                                    />
                                    <Tooltip title='Görüntüle / İndir'>
                                        <IconButton size='small' onClick={() => handleDocumentOpen(doc)}>
                                            <i className='ri-external-link-line' />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title='Kaldır'>
                                        <IconButton size='small' onClick={() => setDocuments(documents.filter((_, idx) => idx !== i))}>
                                            <i className='ri-delete-bin-line' />
                                        </IconButton>
                                    </Tooltip>
                                </div>
                                <Typography variant='caption' color='text.secondary'>
                                    {doc.originalName}
                                    {doc.uploadedAt
                                        ? ` • ${new Date(doc.uploadedAt).toLocaleDateString('tr-TR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}`
                                        : ' • Kayıtta tarih otomatik eklenecek'}
                                </Typography>
                            </div>
                        ))}
                        <Button component='label' variant='outlined' fullWidth disabled={uploadingDocument}>
                            {uploadingDocument ? 'Yükleniyor...' : 'Evrak Yükle'}
                            <input
                                hidden
                                type='file'
                                accept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp'
                                onChange={e => {
                                    const file = e.target.files?.[0]

                                    if (file) handleDocumentUpload(file)
                                    e.target.value = ''
                                }}
                            />
                        </Button>
                    </CardContent>
                </Card>

                <Card className='mbs-6'>
                    <CardContent className='flex flex-col gap-4'>
                        <TextField
                            fullWidth
                            size='small'
                            type='number'
                            label='Sıralama'
                            value={order}
                            onChange={e => setOrder(Number(e.target.value) || 0)}
                        />
                        <FormControlLabel
                            control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
                            label='Aktif'
                        />
                        <div className='flex gap-4'>
                            <Button fullWidth variant='contained' color='primary' onClick={handleSave} disabled={saving}>
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                            <Button
                                fullWidth
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.push(`/${locale}/apps/montage/list`)}
                                disabled={saving}
                            >
                                Vazgeç
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default MontageForm
