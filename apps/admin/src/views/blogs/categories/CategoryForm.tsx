'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'

import { toast } from 'react-toastify'

import RichTextEditor from '@/components/editor/RichTextEditor'
import {
    getBlogCategory,
    createBlogCategory,
    updateBlogCategory
} from '@/utils/api/blogCategories'

type FormState = {
    name: string
    slug: string
    description: string
    order: number
    status: 'active' | 'passive'
    cardImageRatio: CardImageRatio
    seoTitle: string
    seoDescription: string
}

type CardImageRatio = 'square' | 'portrait' | 'landscape'

// Kategori sayfasındaki kart görseli oranı seçenekleri (API'deki CARD_IMAGE_RATIOS ile aynı)
const CARD_IMAGE_RATIO_OPTIONS: { value: CardImageRatio; label: string }[] = [
    { value: 'square', label: 'Kare (1:1)' },
    { value: 'portrait', label: 'Dikey afiş (2:3)' },
    { value: 'landscape', label: 'Yatay (16:9)' }
]

const EMPTY: FormState = {
    name: '', slug: '', description: '', order: 0, status: 'active', cardImageRatio: 'square', seoTitle: '', seoDescription: ''
}

const LIST_URL = '/tr/apps/blogs/categories'

/** Türkçe karakterleri sadeleştirip slug üretir (API ile aynı kural). */
function slugify(text: string): string {
    return String(text || '')
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

const CategoryForm = ({ id }: { id?: string }) => {
    const router = useRouter()
    const isEdit = Boolean(id)

    const [form, setForm] = useState<FormState>(EMPTY)
    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving] = useState(false)
    // Slug elle değiştirildiyse addan otomatik üretmeyi bırak
    const [slugTouched, setSlugTouched] = useState(isEdit)

    useEffect(() => {
        if (!isEdit) return
        let active = true
        ;(async () => {
            try {
                const res = await getBlogCategory(id as string)
                if (!active) return
                if (res?.success && res.data) {
                    setForm({
                        name: res.data.name || '',
                        slug: res.data.slug || '',
                        description: res.data.description || '',
                        order: res.data.order ?? 0,
                        status: res.data.status === 'passive' ? 'passive' : 'active',
                        cardImageRatio: CARD_IMAGE_RATIO_OPTIONS.some(o => o.value === res.data.cardImageRatio)
                            ? res.data.cardImageRatio
                            : 'square',
                        seoTitle: res.data.seo?.title || '',
                        seoDescription: res.data.seo?.description || ''
                    })
                } else {
                    toast.error(res?.message || 'Kategori bulunamadı.')
                    router.push(LIST_URL)
                }
            } catch (e: any) {
                toast.error(e?.message || 'Kategori yüklenemedi.')
                router.push(LIST_URL)
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const setName = (name: string) => {
        setForm(prev => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }))
    }

    const setSlug = (slug: string) => {
        setSlugTouched(true)
        setForm(prev => ({ ...prev, slug: slugify(slug) }))
    }

    const autoGenerateSlug = () => {
        if (!form.name.trim()) {
            toast.error('Lütfen önce Kategori Adı alanını doldurun.')
            return
        }
        setForm(prev => ({ ...prev, slug: slugify(prev.name) }))
        setSlugTouched(true)
        toast.success('SEO URL otomatik oluşturuldu.')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) {
            toast.error('Kategori adı zorunludur.')
            return
        }
        setSaving(true)
        try {
            const payload = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                description: form.description.trim(),
                order: Number(form.order) || 0,
                status: form.status,
                cardImageRatio: form.cardImageRatio,
                seo: {
                    title: form.seoTitle.trim(),
                    description: form.seoDescription.trim()
                }
            }
            const res = isEdit
                ? await updateBlogCategory(id as string, payload)
                : await createBlogCategory(payload)

            if (res?.success) {
                toast.success(isEdit ? 'Kategori güncellendi.' : 'Kategori oluşturuldu.')
                router.push(LIST_URL)
            } else {
                toast.error(res?.message || 'İşlem başarısız oldu.')
            }
        } catch (e: any) {
            toast.error(e?.message || 'İşlem sırasında bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className='flex justify-center p-10'>
                <CircularProgress />
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            {/* Tüm içerik ortalı col-md-8; header de bu genişliğin içinde */}
            <Grid container justifyContent='center'>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6}>
                        {/* Başlık + aksiyonlar (col-md-8 içinde) */}
                        <Grid size={{ xs: 12 }}>
                            <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col' style={{ gap: '10px' }}>
                                <Typography variant='h4' className='mbe-1'>
                                    {isEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
                                </Typography>
                                <div className='flex flex-wrap max-sm:flex-col' style={{ gap: '15px' }}>
                                    <Button variant='outlined' color='secondary' onClick={() => router.push(LIST_URL)} disabled={saving}>
                                        Geri Dön
                                    </Button>
                                    <Button variant='contained' type='submit' disabled={saving}>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                </div>
                            </div>
                        </Grid>

                        {/* Sol: Genel Bilgiler */}
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>Genel Bilgiler</Typography>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Kategori Adı'
                                                value={form.name}
                                                onChange={e => setName(e.target.value)}
                                                required
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant='body2' className='mb-2'>Açıklama</Typography>
                                            <RichTextEditor
                                                value={form.description}
                                                onChange={html => setForm(prev => ({ ...prev, description: html }))}
                                                placeholder='Kategori açıklaması...'
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Sağ sidebar: Durum + Sıralama + SEO Bilgileri */}
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Grid container spacing={6}>
                                {/* Durum */}
                                <Grid size={{ xs: 12 }}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant='h6' className='mb-4'>Durum</Typography>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={form.status === 'active'}
                                                        onChange={e => setForm(prev => ({ ...prev, status: e.target.checked ? 'active' : 'passive' }))}
                                                    />
                                                }
                                                label={form.status === 'active' ? 'Aktif' : 'Pasif'}
                                            />
                                            <Typography variant='body2' color='text.secondary' className='mt-2'>
                                                Kategori aktif olduğunda sitede gözükür.
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Sıralama */}
                                <Grid size={{ xs: 12 }}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant='h6' className='mb-4'>Sıralama</Typography>
                                            <TextField
                                                fullWidth
                                                type='number'
                                                label='Sıra'
                                                value={form.order}
                                                onChange={e => setForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                                            />
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* SEO Bilgileri */}
                                <Grid size={{ xs: 12 }}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant='h6' className='mb-4'>SEO Bilgileri</Typography>
                                            <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO Başlık'
                                                value={form.seoTitle}
                                                onChange={e => setForm(prev => ({ ...prev, seoTitle: e.target.value }))}
                                            />
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    display: 'block', mt: 1, textAlign: 'right',
                                                    color: form.seoTitle.length > 60 ? 'error.main' : 'success.main'
                                                }}
                                            >
                                                {form.seoTitle.length} / 60 karakter
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO Açıklama'
                                                value={form.seoDescription}
                                                onChange={e => setForm(prev => ({ ...prev, seoDescription: e.target.value }))}
                                                multiline
                                                rows={3}
                                            />
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    display: 'block', mt: 1, textAlign: 'right',
                                                    color: form.seoDescription.length > 160 ? 'error.main' : 'success.main'
                                                }}
                                            >
                                                {form.seoDescription.length} / 160 karakter
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO URL'
                                                value={form.slug}
                                                onChange={e => setSlug(e.target.value)}
                                                helperText='Boş bırakılırsa Kategori Adı’ndan otomatik oluşturulur.'
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment
                                                            position='start'
                                                            sx={{
                                                                backgroundColor: '#f0f0f0', borderRadius: '4px',
                                                                paddingX: 1, marginRight: 1,
                                                                color: 'text.secondary', fontSize: '0.85rem'
                                                            }}
                                                        >
                                                            /blog-kategori/
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: (
                                                        <InputAdornment position='end'>
                                                            <Tooltip title='Kategori Adı’ndan otomatik URL oluştur'>
                                                                <IconButton size='small' onClick={autoGenerateSlug} edge='end'>
                                                                    <i className='ri-sparkling-line' />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Grid>
                                            </Grid>
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

export default CategoryForm
