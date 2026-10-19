'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import CircularProgress from '@mui/material/CircularProgress'
import Autocomplete from '@mui/material/Autocomplete'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import tableStyles from '@core/styles/table.module.css'

export type ServiceArea = { cityId: string; cityName: string; districtId: string; districtName: string }

type City = { cityId: string; cityName: string }
type District = { districtId: string; districtName: string }

type Props = {
    cargo: { _id: string; name: string; serviceAreas?: ServiceArea[] }
    listUrl: string
    onSaved: () => void
}

const areaKey = (a: ServiceArea) => `${a.cityId}:${a.districtId}`

const FreeDeliveryRules = ({ cargo, listUrl, onSaved }: Props) => {
    const router = useRouter()
    const [areas, setAreas] = useState<ServiceArea[]>(cargo.serviceAreas || [])
    const [cities, setCities] = useState<City[]>([])
    const [districts, setDistricts] = useState<District[]>([])
    const [city, setCity] = useState<City | null>(null)
    const [pickedDistricts, setPickedDistricts] = useState<District[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchAPI(API_ENDPOINTS.cargo.cities())
            .then(res => setCities(res?.success && Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error('İller yüklenemedi'))
    }, [])

    useEffect(() => {
        setDistricts([])
        setPickedDistricts([])
        if (!city) return
        fetchAPI(API_ENDPOINTS.cargo.districts(city.cityId))
            .then(res => setDistricts(res?.success && Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error('İlçeler yüklenemedi'))
    }, [city])

    const addAreas = () => {
        if (!city) return
        const incoming: ServiceArea[] = pickedDistricts.length
            ? pickedDistricts.map(d => ({ cityId: city.cityId, cityName: city.cityName, districtId: d.districtId, districtName: d.districtName }))
            : [{ cityId: city.cityId, cityName: city.cityName, districtId: '', districtName: '' }]
        setAreas(prev => {
            const wholeCity = incoming.some(a => !a.districtId)
            const kept = prev.filter(a => a.cityId !== city.cityId || (!wholeCity && a.districtId !== ''))
            const merged = [...kept]
            for (const a of incoming) if (!merged.some(m => areaKey(m) === areaKey(a))) merged.push(a)
            return merged
        })
        setCity(null)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.cargo.update(cargo._id), {
                method: 'PUT',
                body: JSON.stringify({ serviceAreas: areas.map(a => ({ cityId: a.cityId, districtId: a.districtId })) })
            })
            if (!res?.success) throw new Error(res?.message || 'Kaydedilemedi')
            toast.success('Hizmet bölgesi kaydedildi')
            onSaved()
        } catch (error: any) {
            toast.error(error.message || 'Kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardHeader
                        title={`Teslimat Kuralları — ${cargo.name}`}
                        action={
                            <div className='flex gap-2'>
                                <Button variant='outlined' color='secondary' startIcon={<i className='ri-arrow-left-line' />} onClick={() => router.push(listUrl)}>
                                    Listeye Dön
                                </Button>
                                <Button variant='contained' startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='ri-save-line' />} onClick={handleSave} disabled={saving}>
                                    Kaydet
                                </Button>
                            </div>
                        }
                    />
                </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardHeader title='Hizmet Bölgesi' action={<Chip label='Teslimat Ücretsiz' color='success' variant='tonal' size='small' />} />
                    <CardContent>
                        <Grid container spacing={4} alignItems='center'>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Autocomplete
                                    options={cities}
                                    value={city}
                                    onChange={(_, value) => setCity(value)}
                                    getOptionLabel={o => o.cityName}
                                    isOptionEqualToValue={(o, v) => o.cityId === v.cityId}
                                    renderInput={params => <TextField {...params} label='İl' />}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    options={districts}
                                    value={pickedDistricts}
                                    onChange={(_, value) => setPickedDistricts(value)}
                                    getOptionLabel={o => o.districtName}
                                    isOptionEqualToValue={(o, v) => o.districtId === v.districtId}
                                    disabled={!city}
                                    renderInput={params => <TextField {...params} label='İlçe' placeholder={pickedDistricts.length ? '' : 'Tüm İlçeler'} />}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <Button fullWidth variant='contained' startIcon={<i className='ri-add-line' />} onClick={addAreas} disabled={!city}>
                                    Ekle
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                    <div className='overflow-x-auto'>
                        <table className={tableStyles.table}>
                            <thead>
                                <tr>
                                    <th>İl</th>
                                    <th>İlçe</th>
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {areas.length === 0 ? (
                                    <tr>
                                        <td colSpan={3}>
                                            <Typography color='text.secondary' className='text-center p-4'>Bölge seçilmedi — teslimat tüm adreslerde sunulur</Typography>
                                        </td>
                                    </tr>
                                ) : areas.map(area => (
                                    <tr key={areaKey(area)}>
                                        <td><Typography color='text.primary' className='font-medium'>{area.cityName}</Typography></td>
                                        <td><Typography>{area.districtName || 'Tüm İlçeler'}</Typography></td>
                                        <td>
                                            <IconButton size='small' onClick={() => setAreas(prev => prev.filter(a => areaKey(a) !== areaKey(area)))}>
                                                <i className='ri-delete-bin-7-line text-textSecondary' />
                                            </IconButton>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </Grid>
        </Grid>
    )
}

export default FreeDeliveryRules
