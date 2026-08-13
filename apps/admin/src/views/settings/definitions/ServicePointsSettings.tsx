'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent, TextField, Button, IconButton, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useSettings } from '@/contexts/SettingsContext'

type ServicePoint = {
    name: string
    phone: string
}

export default function ServicePointsSettings() {
    const { settings, updateField } = useSettings()

    const [points, setPoints] = useState<ServicePoint[]>([])

    useEffect(() => {
        setPoints(settings?.serviceInfo?.points || [])
    }, [settings])

    // Listeyi hem ekranda hem kaydedilecek veride günceller
    const applyChange = (next: ServicePoint[]) => {
        setPoints(next)
        updateField('serviceInfo', 'points', next)
    }

    const handleFieldChange = (index: number, field: keyof ServicePoint, value: string) => {
        applyChange(points.map((point, i) => (i === index ? { ...point, [field]: value } : point)))
    }

    const handleAdd = () => {
        applyChange([...points, { name: '', phone: '' }])
    }

    const handleRemove = (index: number) => {
        applyChange(points.filter((_, i) => i !== index))
    }

    return (
        <Card>
            <CardHeader
                title='Servis Noktaları'
                subheader='Hizmet ürünlerinin kategori kartlarında gösterilir'
            />
            <CardContent>
                <Grid container spacing={4}>
                    {points.length === 0 && (
                        <Grid size={{ xs: 12 }}>
                            <Typography variant='body2' color='text.secondary'>
                                Henüz servis noktası eklenmemiş.
                            </Typography>
                        </Grid>
                    )}

                    {points.map((point, index) => (
                        <Grid size={{ xs: 12 }} key={index} container spacing={3} alignItems='center'>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label='Servis Adı'
                                    placeholder='Şişli Merkez Servis'
                                    value={point.name}
                                    onChange={e => handleFieldChange(index, 'name', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 5 }}>
                                <TextField
                                    fullWidth
                                    label='Telefon'
                                    placeholder='0530 000 00 00'
                                    value={point.phone}
                                    onChange={e => handleFieldChange(index, 'phone', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 1 }}>
                                <IconButton color='error' onClick={() => handleRemove(index)} aria-label='Servis noktasını sil'>
                                    <i className='ri-delete-bin-line' />
                                </IconButton>
                            </Grid>
                        </Grid>
                    ))}

                    <Grid size={{ xs: 12 }}>
                        <Button variant='outlined' onClick={handleAdd} startIcon={<i className='ri-add-line' />}>
                            Servis Noktası Ekle
                        </Button>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}
