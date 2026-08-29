'use client'

import { useState, useRef } from 'react'
import { Card, CardHeader, CardContent, Typography, Box, CircularProgress } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { toast } from 'react-toastify'
import { useSettings } from '@/contexts/SettingsContext'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { getSiteMediaUrl } from '@/utils/activeSite'

type ImageField = 'mailLogo' | 'favicon'

// Yükleme kutuları — alan adı, başlık, açıklama ve önizleme boyutu
const IMAGE_BOXES: { field: ImageField; title: string; maxWidth: number; maxHeight: number }[] = [
    { field: 'mailLogo', title: 'Mail Logo', maxWidth: 200, maxHeight: 100 },
    { field: 'favicon', title: 'Favicon', maxWidth: 64, maxHeight: 64 }
]

// Göreli medya yolunu aktif sitenin medya adresiyle tamamla
const previewUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:')) return url
    const base = getSiteMediaUrl().replace(/\/$/, '')
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function ImagesSettings() {
    const { settings } = useSettings()
    const [images, setImages] = useState<Record<string, string>>(() => ({ ...(settings?.images || {}) }))
    const [busy, setBusy] = useState<ImageField | null>(null)
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

    const handleUpload = async (field: ImageField, file?: File) => {
        if (!file) return

        setBusy(field)

        try {
            const formData = new FormData()
            formData.append('image', file)
            formData.append('type', field)

            const res = await fetchAPI(API_ENDPOINTS.generalSettings.upload(), { method: 'POST', body: formData })

            if (res.success) {
                setImages(prev => ({ ...prev, [field]: res.data.url }))
                toast.success('Görsel yüklendi')
            } else {
                toast.error(res.message || 'Görsel yüklenemedi')
            }
        } catch (err: any) {
            toast.error(err?.message || 'Görsel yüklenemedi')
        } finally {
            setBusy(null)
            if (inputRefs.current[field]) inputRefs.current[field]!.value = ''
        }
    }

    return (
        <Card>
            <CardHeader title='Görseller' />
            <CardContent>
                <Grid container spacing={5}>
                    {IMAGE_BOXES.map(box => {
                        const current = images[box.field]
                        const isBusy = busy === box.field

                        return (
                            <Grid key={box.field} size={{ xs: 12, sm: 12 }}>
                                <Typography variant='subtitle1' className='mb-2'>{box.title}</Typography>
                                <Box
                                    onClick={() => !isBusy && inputRefs.current[box.field]?.click()}
                                    sx={{
                                        border: '2px dashed #ccc',
                                        borderRadius: 2,
                                        p: 3,
                                        textAlign: 'center',
                                        cursor: isBusy ? 'wait' : 'pointer',
                                        '&:hover': { borderColor: 'primary.main' }
                                    }}
                                >
                                    {isBusy ? (
                                        <CircularProgress size={28} />
                                    ) : current ? (
                                        <img
                                            src={previewUrl(current)}
                                            alt={box.title}
                                            style={{ maxWidth: `${box.maxWidth}px`, maxHeight: `${box.maxHeight}px` }}
                                        />
                                    ) : (
                                        <Typography color='text.secondary'>{box.title} yüklemek için tıklayın</Typography>
                                    )}
                                    <input
                                        ref={el => { inputRefs.current[box.field] = el }}
                                        type='file'
                                        accept='image/*'
                                        style={{ display: 'none' }}
                                        onChange={e => handleUpload(box.field, e.target.files?.[0])}
                                    />
                                </Box>
                            </Grid>
                        )
                    })}
                </Grid>
            </CardContent>
        </Card>
    )
}
