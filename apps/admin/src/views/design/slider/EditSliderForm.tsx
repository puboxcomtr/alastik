'use client'

import { useState, useEffect } from 'react'
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
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import { getSliderById, updateSlider } from '@/utils/api/sliders'

type SliderItemType = {
    id: number
    imageFile: File | null
    imagePreview: string | null
    existingImage?: string
    order: number
    description: string
    link: string
    isActive: boolean
    openNewTab: boolean
}

const EditSliderForm = ({ sliderId }: { sliderId: string }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [sliderName, setSliderName] = useState('')
    const [sliders, setSliders] = useState<SliderItemType[]>([])
    const [settings, setSettings] = useState({
        width: '1920',
        height: '600',
        changeSpeed: '500',
        displayDuration: '5000',
        showDescription: true,
        showNavButtons: true,
        showDots: true,
        isActive: true,
        autoStart: false,
        notes: ''
    })

    useEffect(() => {
        loadSlider()
    }, [sliderId])

    const loadSlider = async () => {
        try {
            setLoading(true)
            const slider = await getSliderById(sliderId)

            setSliderName(slider.name)

            const formattedSliders = slider.sliders.map((s: any, idx: number) => ({
                id: Date.now() + idx,
                imageFile: null,
                imagePreview: `http://localhost:3082${s.image}`,
                existingImage: s.image,
                order: s.order,
                description: s.description,
                link: s.link,
                isActive: s.isActive,
                openNewTab: s.openNewTab
            }))

            setSliders(formattedSliders)

            if (slider.settings) {
                setSettings({
                    width: slider.settings.width || '1920',
                    height: slider.settings.height || '600',
                    changeSpeed: slider.settings.changeSpeed || '500',
                    displayDuration: slider.settings.displayDuration || '5000',
                    showDescription: slider.settings.showDescription !== false,
                    showNavButtons: slider.settings.showNavButtons !== false,
                    showDots: slider.settings.showDots !== false,
                    isActive: slider.settings.isActive !== false,
                    autoStart: slider.settings.autoStart || false,
                    notes: slider.settings.notes || ''
                })
            }
        } catch (error: any) {
            toast.error(error.message || 'Slider yüklenemedi')
            router.push('/tr/apps/design/slider')
        } finally {
            setLoading(false)
        }
    }

    const handleAddSlider = () => {
        setSliders([...sliders, {
            id: Date.now(),
            imageFile: null,
            imagePreview: null,
            order: sliders.length + 1,
            description: '',
            link: '',
            isActive: true,
            openNewTab: false
        }])
    }

    const handleRemoveSlider = (id: number) => {
        setSliders(sliders.filter(s => s.id !== id))
    }

    const handleSliderChange = (id: number, field: string, value: any) => {
        setSliders(sliders.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const handleImageSelect = (id: number, file: File) => {
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            setSliders(sliders.map(s =>
                s.id === id
                    ? { ...s, imageFile: file, imagePreview: reader.result as string }
                    : s
            ))
        }
        reader.readAsDataURL(file)
    }

    const handleSettingsChange = (field: string) => (e: any) => {
        setSettings({ ...settings, [field]: e.target.value })
    }

    const validateForm = () => {
        if (!sliderName.trim()) {
            toast.error('Slider adı zorunludur')
            return false
        }

        for (const slider of sliders) {
            if (!slider.imageFile && !slider.existingImage) {
                toast.error('Tüm sliderlar için görsel olmalıdır')
                return false
            }
            if (!slider.description.trim()) {
                toast.error('Tüm sliderlar için açıklama zorunludur')
                return false
            }
        }

        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setSaving(true)

        try {
            const formData = new FormData()
            formData.append('name', sliderName)

            sliders.forEach((slider) => {
                if (slider.imageFile) {
                    formData.append('images', slider.imageFile)
                }
            })

            const slidersData = sliders.map(s => ({
                order: parseInt(s.order as any),
                description: s.description,
                link: s.link,
                isActive: s.isActive,
                openNewTab: s.openNewTab,
                existingImage: s.imageFile ? null : s.existingImage
            }))

            formData.append('sliders', JSON.stringify(slidersData))
            formData.append('settings', JSON.stringify(settings))

            const result = await updateSlider(sliderId, formData)

            if (result.success) {
                toast.success('Slider başarıyla güncellendi')
                router.push('/tr/apps/design/slider')
            } else {
                throw new Error(result.message || 'Slider güncellenemedi')
            }
        } catch (error: any) {
            toast.error(error.message || 'Slider güncellenirken hata oluştu')
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex justify-center items-center p-10">
                    <CircularProgress />
                </CardContent>
            </Card>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6} justifyContent="center">
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-3'>
                                <Typography variant='h4'>Slider Düzenle</Typography>
                                <div className='flex gap-3'>
                                    <Button variant='outlined' color='secondary' onClick={() => router.back()} disabled={saving}>
                                        Geri Dön
                                    </Button>
                                    <Button variant='contained' type='submit' disabled={saving}>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                </div>
                            </div>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <div className='flex justify-between items-center mb-5'>
                                        <Button variant='contained' color='secondary' onClick={handleAddSlider}>
                                            Slider Ekle
                                        </Button>
                                    </div>

                                    {sliders.map((slider, index) => (
                                        <div key={slider.id}>
                                            {index > 0 && <Divider className='my-6' />}
                                            <Grid container spacing={4}>
                                                <Grid size={{ xs: 12, md: 3 }}>
                                                    {slider.imagePreview ? (
                                                        <div className='relative border-2 border-solid border-gray-300 rounded-lg overflow-hidden'>
                                                            <img src={slider.imagePreview} alt='Preview' className='w-full h-48 object-cover' />
                                                            <Button variant='outlined' component='label' size='small' fullWidth className='mt-2'>
                                                                Görseli Değiştir
                                                                <input type='file' hidden accept='image/*' onChange={(e) => {
                                                                    const file = e.target.files?.[0]
                                                                    if (file) handleImageSelect(slider.id, file)
                                                                }} />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center'>
                                                            <i className='ri-image-add-line text-5xl text-gray-400 mb-2' />
                                                            <Typography variant='body2' className='mb-2'>Dosya Seç</Typography>
                                                            <Button variant='outlined' component='label' size='small'>
                                                                Dosya Seç
                                                                <input type='file' hidden accept='image/*' onChange={(e) => {
                                                                    const file = e.target.files?.[0]
                                                                    if (file) handleImageSelect(slider.id, file)
                                                                }} />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </Grid>
                                                <Grid size={{ xs: 12, md: 9 }} className="mt-10">
                                                    <Grid container spacing={3}>
                                                        <Grid size={{ xs: 12, sm: 3 }}>
                                                            <TextField fullWidth type='number' label='Sıra' value={slider.order} onChange={(e) => handleSliderChange(slider.id, 'order', e.target.value)} />
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 5 }}>
                                                            <TextField fullWidth label='Açıklama *' placeholder='Slider açıklaması' value={slider.description} onChange={(e) => handleSliderChange(slider.id, 'description', e.target.value)} required />
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }} style={{ position: 'relative' }}>
                                                            {sliders.length > 1 && (
                                                                <IconButton size='small' color='error' onClick={() => handleRemoveSlider(slider.id)} sx={{ position: 'absolute', top: -50, right: -8, backgroundColor: 'white', zIndex: 1, '&:hover': { backgroundColor: '#ffebee' } }}>
                                                                    <i className='ri-close-line' />
                                                                </IconButton>
                                                            )}
                                                            <TextField fullWidth label='Yönlendirme Linki' placeholder='/kampanyalar' value={slider.link} onChange={(e) => handleSliderChange(slider.id, 'link', e.target.value)} />
                                                        </Grid>
                                                        <Grid size={{ xs: 2 }}>
                                                            <FormControlLabel control={<Switch checked={slider.isActive} onChange={(e) => handleSliderChange(slider.id, 'isActive', e.target.checked)} />} label='Aktif' />
                                                        </Grid>
                                                        <Grid size={{ xs: 4 }}>
                                                            <FormControlLabel control={<Switch checked={slider.openNewTab} onChange={(e) => handleSliderChange(slider.id, 'openNewTab', e.target.checked)} />} label='Yeni Sekmede Aç' />
                                                        </Grid>
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={6} className='mt-5'>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>Genel Özellikler</Typography>
                                    <Grid container spacing={6}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField fullWidth label='Slider Adı *' placeholder='Ana Sayfa Slider' value={sliderName} onChange={(e) => setSliderName(e.target.value)} required />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField fullWidth label='Slider Genişliği' placeholder='1920' value={settings.width} onChange={handleSettingsChange('width')} />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField fullWidth label='Slider Yüksekliği' placeholder='600' value={settings.height} onChange={handleSettingsChange('height')} />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField fullWidth label='Resimlerin Değişme Süresi (ms)' placeholder='500' value={settings.changeSpeed} onChange={handleSettingsChange('changeSpeed')} />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField fullWidth label='Resmin Görüntülenme Süresi (ms)' placeholder='5000' value={settings.displayDuration} onChange={handleSettingsChange('displayDuration')} />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <FormControlLabel control={<Switch checked={settings.showDescription} onChange={(e) => setSettings({ ...settings, showDescription: e.target.checked })} />} label='Açıklama alanı gösterilsin' />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <FormControlLabel control={<Switch checked={settings.showNavButtons} onChange={(e) => setSettings({ ...settings, showNavButtons: e.target.checked })} />} label='İleri-Geri butonları gösterilsin' />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <FormControlLabel control={<Switch checked={settings.showDots} onChange={(e) => setSettings({ ...settings, showDots: e.target.checked })} />} label='Slider altında geçiş butonları olsun' />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Grid container spacing={6}>
                                <Grid size={{ xs: 12 }}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant='h6' className='mb-4'>Durum</Typography>
                                            <FormControlLabel control={<Switch checked={settings.isActive} onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })} />} label={settings.isActive ? 'Aktif' : 'Pasif'} />
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant='h6' className='mb-4'>Otomatik Başlatma</Typography>
                                            <FormControlLabel control={<Switch checked={settings.autoStart} onChange={(e) => setSettings({ ...settings, autoStart: e.target.checked })} />} label={settings.autoStart ? 'Aktif' : 'Pasif'} />
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant='h6' className='mb-4'>Açıklama</Typography>
                                            <TextField fullWidth multiline rows={4} placeholder='Slider için kullanılan görsel boyutları veya slider sisteminin nerede kullanıldığı ile ilgili notlar ekleyebilirsiniz.' value={settings.notes} onChange={handleSettingsChange('notes')} />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default EditSliderForm