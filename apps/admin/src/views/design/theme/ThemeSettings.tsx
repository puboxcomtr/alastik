'use client'

import React, { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { toast } from 'react-toastify'
import type { ThemeSettings as ThemeSettingsType } from '@/types/apps/themeTypes'
import { fetchAPI } from '@libs/api'


const menuItems = [
    { id: 'tab1', label: 'Genel Ayarlar' },
    { id: 'tab2', label: 'Footer' },
    { id: 'tab3', label: 'Sosyal Ağlar' },
    { id: 'tab4', label: 'Slider Ayarları' },
    { id: 'tab5', label: 'Vitrin Ayarları' }
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082'

const getImageUrl = (url: string | undefined | null): string | null => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${MEDIA_URL}${url.startsWith('/') ? url : '/' + url}`
}

interface ImageUploadProps {
    title: string
    description?: string
    type: string
    currentImage?: string
    onUpload: (url: string) => void
}

const ImageUpload = ({ title, description, type, currentImage, onUpload }: ImageUploadProps) => {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState(currentImage)

    useEffect(() => {
        setPreview(currentImage)
    }, [currentImage])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('image', file)
        formData.append('type', type)

        try {
            setUploading(true)
            const data = await fetchAPI(`${API_URL}/admin/design/settings/theme/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            })

            if (data.success && data.data?.url) {
                setPreview(data.data.url)
                onUpload(data.data.url)
                toast.success('Görsel yüklendi')
            } else {
                toast.error(data.message || 'Görsel yüklenemedi')
            }
        } catch (error) {
            toast.error('Görsel yüklenemedi')
        } finally {
            setUploading(false)
        }
    }

    return (
        <>
            <FormControl fullWidth className='mb-4'>
                <div className='flex justify-between items-center gap-4'>
                    {description ? (
                        <div className='flex flex-col'>
                            <Typography variant='body2' className='text-base font-semibold'>{title}</Typography>
                            <Typography variant='body2' color='text.secondary' className='font-light'>{description}</Typography>
                        </div>
                    ) : (
                        <Typography variant='body2' className='text-base font-semibold'>{title}</Typography>
                    )}
                    <div className='w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0 relative overflow-hidden'>
                        {preview && (
                            <img
                                src={getImageUrl(preview) || ''}
                                alt={title}
                                className='w-full h-full object-cover'
                            />
                        )}
                        <Button
                            variant='text'
                            component='label'
                            className='text-sm absolute inset-0 bg-white/80 hover:bg-white/90'
                            disabled={uploading}
                        >
                            {uploading ? 'Yükleniyor...' : preview ? 'Değiştir' : 'Yükle'}
                            <input type='file' hidden accept='image/*' onChange={handleFileChange} />
                        </Button>
                    </div>
                </div>
            </FormControl>
            <Divider className='mb-4' />
        </>
    )
}

const ThemeSettings = () => {
    const [activeMenu, setActiveMenu] = useState('tab1')
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<ThemeSettingsType>({})

    const [sliderList, setSliderList] = useState<any[]>([])
    const [loadingSliders, setLoadingSliders] = useState(true)

    const [showcaseList, setShowcaseList] = useState<any[]>([])
    const [loadingShowcases, setLoadingShowcases] = useState(true)

    useEffect(() => {
        fetchSettings()
        fetchSliderList()
        fetchShowcaseList()
    }, [])

    const fetchSettings = async () => {
        try {
            const data = await fetchAPI(`${API_URL}/admin/design/settings/theme`, {
                credentials: 'include'
            })
            if (data.success && data.data) {
                setSettings(data.data)
            }
        } catch (error) {
            console.error('Settings fetch error:', error)
        }
    }

    const fetchSliderList = async () => {
        try {
            setLoadingSliders(true)
            const data = await fetchAPI(`${API_URL}/admin/design/slider`, {
                credentials: 'include'
            })
            if (data.success && data.data) {
                setSliderList(data.data)
            }
        } catch (error) {
            console.error('Slider listesi yüklenemedi:', error)
        } finally {
            setLoadingSliders(false)
        }
    }

    const fetchShowcaseList = async () => {
        try {
            setLoadingShowcases(true)
            const data = await fetchAPI(`${API_URL}/admin/showcases?is_active=true`, {
                credentials: 'include'
            })
            if (data.success && data.data) {
                setShowcaseList(data.data)
            }
        } catch (error) {
            console.error('Vitrin listesi yüklenemedi:', error)
        } finally {
            setLoadingShowcases(false)
        }
    }

    const handleChange = (key: keyof ThemeSettingsType, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const data = await fetchAPI(`${API_URL}/admin/design/settings/theme`, {
                method: 'PUT',
                credentials: 'include',
                body: JSON.stringify({ value: settings })
            })

            if (data.success) {
                toast.success('Ayarlar kaydedildi')
            } else {
                toast.error('Kaydetme hatası')
            }
        } catch (error) {
            toast.error('Ayarlar kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    const renderContent = () => {
        switch (activeMenu) {
            case 'tab1':
                return (
                    <>
                        <ImageUpload
                            title="Logo"
                            type="logo"
                            currentImage={settings.logo}
                            onUpload={(url: string) => handleChange('logo', url)}
                        />
                        <ImageUpload
                            title="Varsayılan Katalog Görseli"
                            description="Resmi yüklenmemiş ürünler, kategoriler ve markalar için kullanabileceğiniz varsayılan görsel."
                            type="default-catalog"
                            currentImage={settings.defaultCatalogImage}
                            onUpload={(url: string) => handleChange('defaultCatalogImage', url)}
                        />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Marka Gösterim Tipi</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Seçilen kategorilere bağlı olan markalar, buradaki seçiminize göre gösterilecektir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select value={settings.brandDisplayType || ''} onChange={(e) => handleChange('brandDisplayType', e.target.value)}>
                                        <MenuItem value='name'>İsim</MenuItem>
                                        <MenuItem value='image'>Görsel</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>Vitrinde Ürün Gösterim Adeti</Typography>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select value={settings.showcaseDisplayCount || ''} onChange={(e) => handleChange('showcaseDisplayCount', e.target.value)}>
                                        <MenuItem value='4'>4</MenuItem>
                                        <MenuItem value='5'>5</MenuItem>
                                        <MenuItem value='6'>6</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>Blog Sayfasında Gösterim Adeti</Typography>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select value={settings.blogDisplayCount || ''} onChange={(e) => handleChange('blogDisplayCount', e.target.value)}>
                                        <MenuItem value='4'>4</MenuItem>
                                        <MenuItem value='5'>5</MenuItem>
                                        <MenuItem value='6'>6</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Kategori Logolarının Gösterimi</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Açık olduğunda kategori listelenen yerlerde, kategori logosu gösterilir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.isActive || false} onChange={(e) => handleChange('isActive', e.target.checked)} />}
                                        label={settings.isActive ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Kategorideki Markaların Gösterimi</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bir kategoride ürünleri yer alan markalar, o kategorinin ürünleri listelenirken üst kısımda gösterilir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.isBrand || false} onChange={(e) => handleChange('isBrand', e.target.checked)} />}
                                        label={settings.isBrand ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Sipariş aşamalarında KDV Gösterimi</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Eğer seçenek aktifleştirilirse tüm ürünler KDV Dahil gösterilir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.isTax || false} onChange={(e) => handleChange('isTax', e.target.checked)} />}
                                        label={settings.isTax ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Facebook Login Sistemi</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>Facebook üyeliği üzerinden sisteme üye olma özelliğidir.</Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.isFacebook || false} onChange={(e) => handleChange('isFacebook', e.target.checked)} />}
                                        label={settings.isFacebook ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Google Hesabı ile Login Sistemi</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>Google hesabı üzerinden sisteme üye olma özelliğidir.</Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.isGoogle || false} onChange={(e) => handleChange('isGoogle', e.target.checked)} />}
                                        label={settings.isGoogle ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Jquery Lazy Load Eklentisi Kullanımı</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Siteniz üzerinde bulunan resim dosyalarını ziyaretçilerinize ilk yükleme anında göstermek yerine gezinti sırasında yüklenmesini sağlayarak sitenizin ilk açılış performansını artıran bir özelliktir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.isLazyLoad || false} onChange={(e) => handleChange('isLazyLoad', e.target.checked)} />}
                                        label={settings.isLazyLoad ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                    </>
                )

            case 'tab2':
                return (
                    <>
                        <ImageUpload
                            title="Footer Logo"
                            type="footer-logo"
                            currentImage={settings.footerLogo}
                            onUpload={(url: string) => handleChange('footerLogo', url)}
                        />
                        <ImageUpload
                            title="Footer SSL Resmi"
                            type="ssl"
                            currentImage={settings.footerSslImage}
                            onUpload={(url: string) => handleChange('footerSslImage', url)}
                        />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>Footer menülerinin mobil görünümü</Typography>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select value={settings.footerMobile || ''} onChange={(e) => handleChange('footerMobile', e.target.value)}>
                                        <MenuItem value='accordion'>Akordiyon</MenuItem>
                                        <MenuItem value='list'>Liste</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>E-Bülten Başlığı</Typography>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField fullWidth value={settings.newsletterTitle || ''} onChange={(e) => handleChange('newsletterTitle', e.target.value)} />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>E-Bülten Metni</Typography>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField fullWidth value={settings.newsletterContent || ''} onChange={(e) => handleChange('newsletterContent', e.target.value)} />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>Copyright Yazısı</Typography>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField fullWidth value={settings.seoTitle || ''} onChange={(e) => handleChange('seoTitle', e.target.value)} />
                                </FormControl>
                            </div>
                        </FormControl>
                    </>
                )

            case 'tab3':
                const socialFields = [
                    { key: 'facebook' as const, label: 'Facebook Adresi' },
                    { key: 'instagram' as const, label: 'Instagram Adresi' },
                    { key: 'twitter' as const, label: 'Twitter Adresi' },
                    { key: 'youtube' as const, label: 'Youtube Adresi' },
                    { key: 'linkedin' as const, label: 'Linkedin Adresi' },
                    { key: 'whatsapp' as const, label: 'Whatsapp Adresi' }
                ]

                const marketplaceFields = [
                    { key: 'trendyol' as const, label: 'Trendyol Mağaza Adresi' },
                    { key: 'hepsiburada' as const, label: 'Hepsiburada Mağaza Adresi' },
                    { key: 'pttavm' as const, label: 'PTTAVM Mağaza Adresi' },
                    { key: 'pazarama' as const, label: 'Pazarama Mağaza Adresi' },
                    { key: 'n11' as const, label: 'N11 Mağaza Adresi' },
                    { key: 'idefix' as const, label: 'İdefix Mağaza Adresi' }
                ]

                return (
                    <>
                        {socialFields.map((field) => (
                            <div key={field.key}>
                                <FormControl fullWidth className='mb-4'>
                                    <div className='flex justify-between items-center gap-4'>
                                        <div className='flex flex-col'>
                                            <Typography variant='body2' className='text-base font-semibold'>{field.label}</Typography>
                                            <Typography variant='body2' color='text.secondary' className='font-light'>Bu alan boş bırakıldığında ikonu görünmeyecektir</Typography>
                                        </div>
                                        <FormControl className='w-1/2 flex-shrink-0'>
                                            <TextField fullWidth value={settings[field.key] || ''} onChange={(e) => handleChange(field.key, e.target.value)} />
                                        </FormControl>
                                    </div>
                                </FormControl>
                                <Divider className='mb-4' />
                            </div>
                        ))}

                        <Divider className='mb-10 mt-10' />

                        {marketplaceFields.map((field, index) => (
                            <div key={field.key}>
                                <FormControl fullWidth className='mb-4'>
                                    <div className='flex justify-between items-center gap-4'>
                                        <div className='flex flex-col'>
                                            <Typography variant='body2' className='text-base font-semibold'>{field.label}</Typography>
                                            <Typography variant='body2' color='text.secondary' className='font-light'>Bu alan boş bırakıldığında linki gözükmeyecektir</Typography>
                                        </div>
                                        <FormControl className='w-1/2 flex-shrink-0'>
                                            <TextField fullWidth value={settings[field.key] || ''} onChange={(e) => handleChange(field.key, e.target.value)} />
                                        </FormControl>
                                    </div>
                                </FormControl>
                                {index < marketplaceFields.length - 1 && <Divider className='mb-4' />}
                            </div>
                        ))}
                    </>
                )

            case 'tab4':
                return (
                    <>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Varsayılan Masaüstü Slider</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Anasayfa slider alanında 'Tema Slider' yerine Tasarım Ayarları - Slider Yönetimi sayfasındaki 'default' sliderı kullanmak için 'Slider Yönetimi'ni seçebilirsiniz.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.homepage || false} onChange={(e) => handleChange('homepage', e.target.checked)} />}
                                        label={settings.homepage ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Slider Durumu</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>Anasayfadaki slider seçim durumunu belirleyiniz.</Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={settings.sliderSelect || ''}
                                        onChange={(e) => handleChange('sliderSelect', e.target.value)}
                                        disabled={loadingSliders}
                                    >
                                        <MenuItem value=''>Seçiniz</MenuItem>
                                        {sliderList.map((slider) => (
                                            <MenuItem key={slider._id} value={slider._id}>
                                                {slider.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>Mobil Slider Durumu</Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>Anasayfadaki mobil slider seçim durumunu belirleyiniz.</Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={settings.mobileSelect || ''}
                                        onChange={(e) => handleChange('mobileSelect', e.target.value)}
                                        disabled={loadingSliders}
                                    >
                                        <MenuItem value=''>Seçiniz</MenuItem>
                                        {sliderList.map((slider) => (
                                            <MenuItem key={slider._id} value={slider._id}>
                                                {slider.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>Otomatik Başlasın mı?</Typography>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={<Switch checked={settings.autostart || false} onChange={(e) => handleChange('autostart', e.target.checked)} />}
                                        label={settings.autostart ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                    </>
                )

            case 'tab5':
                const vitrins = [
                    { key: 'First', label: '1' },
                    { key: 'Second', label: '2' },
                    { key: 'Third', label: '3' },
                    { key: 'Fourth', label: '4' },
                    { key: 'Fifth', label: '5' }
                ]

                return (
                    <>
                        {vitrins.map((vitrin, index) => (
                            <React.Fragment key={vitrin.key}>
                                <FormControl fullWidth className='mb-4'>
                                    <div className='flex justify-between items-center gap-4'>
                                        <Typography variant='body2' className='text-base font-semibold'>
                                            Vitrin {vitrin.label} Üst Başlık
                                        </Typography>
                                        <FormControl className='w-1/2 flex-shrink-0'>
                                            <TextField
                                                fullWidth
                                                value={settings[`showcasename${vitrin.key}` as keyof typeof settings] || ''}
                                                onChange={(e) => handleChange(`showcasename${vitrin.key}` as keyof typeof settings, e.target.value)}
                                            />
                                        </FormControl>
                                    </div>
                                </FormControl>
                                <FormControl fullWidth className='mb-4'>
                                    <div className='flex justify-between items-center gap-4'>
                                        <Typography variant='body2' className='text-base font-semibold'>
                                            Vitrin {vitrin.label} Alt Başlık
                                        </Typography>
                                        <FormControl className='w-1/2 flex-shrink-0'>
                                            <TextField
                                                fullWidth
                                                value={settings[`showcasesub${vitrin.key}` as keyof typeof settings] || ''}
                                                onChange={(e) => handleChange(`showcasesub${vitrin.key}` as keyof typeof settings, e.target.value)}
                                            />
                                        </FormControl>
                                    </div>
                                </FormControl>
                                <FormControl fullWidth className='mb-4'>
                                    <div className='flex justify-between items-center gap-4'>
                                        <Typography variant='body2' className='text-base font-semibold'>
                                            Vitrin {vitrin.label} Ürün Seçimi
                                        </Typography>
                                        <FormControl className='w-1/2 flex-shrink-0'>
                                            <Select
                                                value={settings[`showcase${vitrin.key}` as keyof typeof settings] || ''}
                                                onChange={(e) => handleChange(`showcase${vitrin.key}` as keyof typeof settings, e.target.value)}
                                                disabled={loadingShowcases}
                                            >
                                                <MenuItem value=''>Seçiniz</MenuItem>
                                                {showcaseList.map((showcase) => (
                                                    <MenuItem key={showcase.id} value={showcase.id}>
                                                        {showcase.title} ({showcase.productCount} ürün)
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </div>
                                </FormControl>
                                {index < vitrins.length - 1 && <Divider className='mb-4 mt-2' />}
                            </React.Fragment>
                        ))}
                    </>
                )

            default:
                return null
        }
    }

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 4 }}>
                <Card className='p-4'>
                    <Typography variant='h6' className='mb-4'>Tema Ayarları</Typography>
                    <div className='flex flex-col gap-2'>
                        {menuItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setActiveMenu(item.id)}
                                className={`p-3 rounded cursor-pointer transition-all ${activeMenu === item.id
                                    ? 'bg-pink-50 text-pink-600'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                {item.label}
                            </div>
                        ))}
                    </div>
                </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
                <Card className='p-6'>
                    {renderContent()}
                    <Divider className='mb-4' />
                    <Button
                        type='button'
                        variant='contained'
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                    </Button>
                </Card>
            </Grid>
        </Grid>
    )
}

export default ThemeSettings