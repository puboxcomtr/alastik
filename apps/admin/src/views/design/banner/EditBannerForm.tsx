'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/* MUI */
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import FormControl from '@mui/material/FormControl'

/* Toast */
import { toast } from 'react-toastify'

import { fetchBanner, updateBanner } from '@/utils/api/banners'

type Props = {
    bannerId: string
}

const EditBannerForm = ({ bannerId }: Props) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [dataLoading, setDataLoading] = useState(true)

    // Form state
    const [description, setDescription] = useState('')
    const [redirectUrl, setRedirectUrl] = useState('')
    const [altTag, setAltTag] = useState('')
    const [status, setStatus] = useState<'active' | 'inactive'>('active')
    const [openNewTab, setOpenNewTab] = useState(false)
    const [order, setOrder] = useState(0)
    const [image, setImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')
    const [existingImage, setExistingImage] = useState<string>('')

    // Slug oluşturma fonksiyonu
    const generateSlug = (text: string) => {
        return text
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/-+/g, '_')
            .trim()
    }

    // Computed variableKey
    const variableKey = useMemo(() => generateSlug(description), [description])

    // Banner verilerini yükle
    useEffect(() => {
        const loadBanner = async () => {
            try {
                setDataLoading(true)
                const result = await fetchBanner(bannerId)
                if (result.success) {
                    const banner = result.data
                    setDescription(banner.description)
                    setRedirectUrl(banner.redirectUrl || '')
                    setAltTag(banner.altTag || '')
                    setStatus(banner.status)
                    setOpenNewTab(banner.openNewTab)
                    setOrder(banner.order)
                    setExistingImage(banner.image)
                    setImagePreview(`http://localhost:3082${banner.image}`)
                }
            } catch (error: any) {
                toast.error(error.message || 'Banner yüklenirken hata oluştu')
                router.push('/tr/apps/design/banner')
            } finally {
                setDataLoading(false)
            }
        }

        loadBanner()
    }, [bannerId, router])

    const handleImageSelect = (file: File) => {
        setImage(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const validateForm = () => {
        if (!description.trim()) {
            toast.error('Açıklama zorunludur')
            return false
        }

        if (!variableKey || variableKey.length < 2) {
            toast.error('Açıklama en az 2 karakter olmalıdır')
            return false
        }

        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('description', description.trim())
            formData.append('redirectUrl', redirectUrl.trim())
            formData.append('altTag', altTag.trim())
            formData.append('status', status)
            formData.append('openNewTab', openNewTab.toString())
            formData.append('variableKey', variableKey)
            formData.append('order', order.toString())

            // Yeni görsel seçildiyse ekle, yoksa mevcut görseli kullan
            if (image) {
                formData.append('image', image)
            }

            const result = await updateBanner(bannerId, formData)

            if (result.success) {
                toast.success('Banner başarıyla güncellendi')
                router.push('/tr/apps/design/banner')
            } else {
                throw new Error(result.message || 'Banner güncellenemedi')
            }
        } catch (error: any) {
            toast.error(error.message || 'Banner güncellenirken hata oluştu')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (dataLoading) {
        return (
            <Grid container spacing={6} justifyContent={'center'}>
                <Grid size={{ xs: 12, md: 9 }}>
                    <Card>
                        <CardContent className='text-center p-6'>
                            <Typography>Yükleniyor...</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6} justifyContent={'center'}>
                <Grid size={{ xs: 12, md: 9 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-3'>
                                <Typography variant='h4'>Banner Düzenle</Typography>
                                <div className='flex gap-3'>
                                    <Button
                                        variant='outlined'
                                        color='secondary'
                                        onClick={() => router.back()}
                                        disabled={loading}
                                    >
                                        Geri Dön
                                    </Button>
                                    <Button variant='contained' type='submit' disabled={loading}>
                                        {loading ? 'Kaydediliyor...' : 'Güncelle'}
                                    </Button>
                                </div>
                            </div>
                        </Grid>

                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Card>
                                    <CardContent>
                                        <Typography variant='h6' className='mb-4'>Banner Bilgileri</Typography>
                                        <Grid container spacing={6}>
                                            {/* Açıklama */}
                                            <Grid size={{ xs: 12 }}>
                                                <TextField
                                                    fullWidth
                                                    label='Açıklama'
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    required
                                                    multiline
                                                    rows={2}
                                                    helperText={variableKey ? `Değişken adı: ${variableKey}` : 'Değişken adı otomatik oluşacaktır.'}
                                                />
                                            </Grid>

                                            {/* Yönlendirme Linki */}
                                            <Grid size={{ xs: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    label='Yönlendirme Linki'
                                                    value={redirectUrl}
                                                    onChange={(e) => setRedirectUrl(e.target.value)}
                                                />
                                            </Grid>

                                            {/* Alt Etiket */}
                                            <Grid size={{ xs: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    label='Alt Etiketi'
                                                    value={altTag}
                                                    onChange={(e) => setAltTag(e.target.value)}
                                                />
                                            </Grid>

                                            {/* Sıra */}
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    type='number'
                                                    label='Sıra No'
                                                    value={order}
                                                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                                />
                                            </Grid>

                                            {/* Görsel Upload */}
                                            <Grid size={{ xs: 12 }}>
                                                <Typography variant='body2' className='mb-2'>
                                                    Banner Görseli
                                                </Typography>
                                                <div className='relative border-2 border-solid border-gray-300 rounded-lg overflow-hidden'>
                                                    <img
                                                        src={imagePreview}
                                                        alt='Preview'
                                                        className='w-full h-48 object-cover'
                                                    />
                                                    <Button
                                                        variant='outlined'
                                                        component='label'
                                                        size='small'
                                                        className='mt-2 w-full'
                                                    >
                                                        Görseli Değiştir
                                                        <input
                                                            type='file'
                                                            hidden
                                                            accept='image/*'
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) handleImageSelect(file)
                                                            }}
                                                        />
                                                    </Button>
                                                </div>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <Grid container spacing={6}>
                                    {/* Durum */}
                                    <Grid size={{ xs: 12 }}>
                                        <Card>
                                            <CardContent>
                                                <FormControl component='fieldset'>
                                                    <FormLabel component='legend' className='mb-3'>
                                                        Durum
                                                    </FormLabel>
                                                    <RadioGroup
                                                        value={status}
                                                        onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                                                    >
                                                        <FormControlLabel
                                                            value='active'
                                                            control={<Radio />}
                                                            label='Aktif'
                                                        />
                                                        <FormControlLabel
                                                            value='inactive'
                                                            control={<Radio />}
                                                            label='Pasif'
                                                        />
                                                    </RadioGroup>
                                                </FormControl>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    {/* Yeni Sekmede Aç */}
                                    <Grid size={{ xs: 12 }}>
                                        <Card>
                                            <CardContent>
                                                <FormControl component='fieldset'>
                                                    <FormLabel component='legend' className='mb-3'>
                                                        Yeni Sekmede Aç
                                                    </FormLabel>
                                                    <RadioGroup
                                                        value={openNewTab ? 'true' : 'false'}
                                                        onChange={(e) => setOpenNewTab(e.target.value === 'true')}
                                                    >
                                                        <FormControlLabel
                                                            value='true'
                                                            control={<Radio />}
                                                            label='Evet'
                                                        />
                                                        <FormControlLabel
                                                            value='false'
                                                            control={<Radio />}
                                                            label='Hayır'
                                                        />
                                                    </RadioGroup>
                                                </FormControl>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default EditBannerForm