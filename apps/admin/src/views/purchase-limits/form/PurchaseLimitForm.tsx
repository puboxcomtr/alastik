'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import OutlinedInput from '@mui/material/OutlinedInput'
import Chip from '@mui/material/Chip'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@/libs/api'
import LimitTargetSelector from './LimitTargetSelector'

interface PurchaseLimitFormProps {
    isEdit?: boolean
    id?: string
}

interface TargetItem {
    targetId: string
    targetName: string
}

const memberGroupOptions = [
    { value: 'member', label: 'Bireysel Üye' },
    { value: 'dealer', label: 'Bayi' },
    { value: 'guest', label: 'Misafir' }
]

const PurchaseLimitForm = ({ isEdit = false, id }: PurchaseLimitFormProps) => {
    const router = useRouter()
    const { lang: locale } = useParams()

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)

    const [name, setName] = useState('')
    const [minLimit, setMinLimit] = useState<string>('')
    const [maxLimit, setMaxLimit] = useState<string>('')
    const [limitType, setLimitType] = useState<'product' | 'category' | 'brand' | ''>('')
    const [targets, setTargets] = useState<TargetItem[]>([])
    const [memberGroups, setMemberGroups] = useState<string[]>([])
    const [priority, setPriority] = useState<string>('0')
    const [isActive, setIsActive] = useState(true)

    useEffect(() => {
        if (isEdit && id) {
            fetchData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, id])

    const fetchData = async () => {
        try {
            setFetching(true)
            const response = await fetchAPI(API_ENDPOINTS.purchaseLimits.detail(id!), { cache: 'no-store' })
            const data = response.data
            setName(data.name || '')
            setMinLimit(data.minLimit != null ? String(data.minLimit) : '')
            setMaxLimit(data.maxLimit != null ? String(data.maxLimit) : '')
            setLimitType(data.limitType || '')
            setTargets(data.targets || [])
            setMemberGroups(data.memberGroups || [])
            setPriority(String(data.priority ?? 0))
            setIsActive(data.isActive !== false)
        } catch (error) {
            console.error('Detail fetch error:', error)
            toast.error('Limit yüklenemedi')
        } finally {
            setFetching(false)
        }
    }

    const handleLimitTypeChange = (newType: 'product' | 'category' | 'brand') => {
        if (newType !== limitType) {
            setLimitType(newType)
            setTargets([])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('Limit adı zorunludur')
            return
        }
        if (!limitType) {
            toast.error('Limit türünü seçiniz')
            return
        }
        if (targets.length === 0) {
            toast.error('En az bir hedef seçiniz')
            return
        }
        if (memberGroups.length === 0) {
            toast.error('En az bir üye/bayi grubu seçiniz')
            return
        }

        const minNum = minLimit !== '' ? Number(minLimit) : null
        const maxNum = maxLimit !== '' ? Number(maxLimit) : null

        if (minNum != null && maxNum != null && minNum > maxNum) {
            toast.error('Minimum limit, maksimum limitten büyük olamaz')
            return
        }

        setLoading(true)

        try {
            const payload = {
                name: name.trim(),
                minLimit: minNum,
                maxLimit: maxNum,
                limitType,
                targets,
                memberGroups,
                priority: Number(priority) || 0,
                isActive
            }

            if (isEdit && id) {
                await fetchAPI(API_ENDPOINTS.purchaseLimits.update(id), {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                })
                toast.success('Satın alma limiti güncellendi')
            } else {
                await fetchAPI(API_ENDPOINTS.purchaseLimits.create(), {
                    method: 'POST',
                    body: JSON.stringify(payload)
                })
                toast.success('Satın alma limiti oluşturuldu')
                router.push(`/${locale}/apps/purchase-limits/list`)
            }
        } catch (error: any) {
            console.error('Submit error:', error)
            toast.error(error.message || 'Kayıt başarısız')
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight={400}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={8} justifyContent='center'>
                <Grid size={{ xs: 10 }}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-y-4'>
                                <Box>
                                    <Typography variant='h4'>
                                        {isEdit ? 'Satın Alma Limiti Düzenle' : 'Satın Alma Limiti Ekle'}
                                    </Typography>
                                </Box>
                                <div className='flex gap-4'>
                                    <Button
                                        variant='outlined'
                                        color='secondary'
                                        onClick={() => router.push(`/${locale}/apps/purchase-limits/list`)}
                                        disabled={loading}
                                    >
                                        İptal
                                    </Button>
                                    <Button type='submit' variant='contained' disabled={loading}>
                                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                </div>
                            </div>
                        </Grid>

                        <Grid size={{ xs: 8 }} container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <Card>
                                    <CardHeader title='Limit Bilgileri' subheader='Limit adı, min/maks değer ve öncelik' />
                                    <CardContent>
                                        <Grid container spacing={5}>
                                            <Grid size={{ xs: 12 }}>
                                                <Tooltip title='Limit için tanımlayıcı bir ad' placement='top-start' arrow>
                                                    <TextField
                                                        fullWidth
                                                        label='Limit Adı'
                                                        placeholder='Örn: Yaz Lastiği Toplu Alım Limiti'
                                                        value={name}
                                                        onChange={e => setName(e.target.value)}
                                                        required
                                                    />
                                                </Tooltip>
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <Tooltip title='Minimum kaç adet ürün alınabilir' placement='top-start' arrow>
                                                    <TextField
                                                        fullWidth
                                                        type='number'
                                                        label='Minimum Limit'
                                                        value={minLimit}
                                                        onChange={e => setMinLimit(e.target.value)}
                                                        inputProps={{ min: 0 }}
                                                    />
                                                </Tooltip>
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <Tooltip title='Maksimum kaç adet ürün alınabilir' placement='top-start' arrow>
                                                    <TextField
                                                        fullWidth
                                                        type='number'
                                                        label='Maksimum Limit'
                                                        value={maxLimit}
                                                        onChange={e => setMaxLimit(e.target.value)}
                                                        inputProps={{ min: 0 }}
                                                    />
                                                </Tooltip>
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <Tooltip title='Çakışma durumunda yüksek öncelikli limit uygulanır' placement='top-start' arrow>
                                                    <TextField
                                                        fullWidth
                                                        type='number'
                                                        label='Öncelik'
                                                        value={priority}
                                                        onChange={e => setPriority(e.target.value)}
                                                        inputProps={{ min: 0 }}
                                                    />
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Card>
                                    <CardHeader title='Limit Kapsamı' subheader='Tür, hedef ve uygulanacak üye grubu' />
                                    <CardContent>
                                        <Grid container spacing={5}>
                                            <Grid size={{ xs: 6 }}>
                                                <FormControl fullWidth required size='small'>
                                                    <InputLabel>Satın Alma Limiti Türü</InputLabel>
                                                    <Select
                                                        value={limitType}
                                                        label='Satın Alma Limiti Türü'
                                                        onChange={e => handleLimitTypeChange(e.target.value as any)}
                                                    >
                                                        <MenuItem value=''>
                                                            <em>Limit türünü seçin</em>
                                                        </MenuItem>
                                                        <MenuItem value='product'>Ürün Bazlı</MenuItem>
                                                        <MenuItem value='category'>Kategori Bazlı</MenuItem>
                                                        <MenuItem value='brand'>Marka Bazlı</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <FormControl fullWidth required size='small'>
                                                    <InputLabel>Üye/Bayi Grubu</InputLabel>
                                                    <Select
                                                        multiple
                                                        value={memberGroups}
                                                        onChange={e =>
                                                            setMemberGroups(
                                                                typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                                                            )
                                                        }
                                                        input={<OutlinedInput label='Üye/Bayi Grubu' />}
                                                        renderValue={selected => (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                {selected.map(value => {
                                                                    const opt = memberGroupOptions.find(o => o.value === value)
                                                                    return <Chip key={value} label={opt?.label || value} size='small' />
                                                                })}
                                                            </Box>
                                                        )}
                                                    >
                                                        {memberGroupOptions.map(opt => (
                                                            <MenuItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {limitType && (
                                                <Grid size={{ xs: 12 }}>
                                                    <Divider sx={{ mb: 3 }} />
                                                    <LimitTargetSelector
                                                        limitType={limitType}
                                                        targets={targets}
                                                        onChange={setTargets}
                                                    />
                                                </Grid>
                                            )}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Grid size={{ xs: 4 }} container spacing={5}>
                            <Grid size={{ xs: 12 }}>
                                <Card className='mb-5'>
                                    <CardHeader title='Durum' />
                                    <CardContent>
                                        <Box display='flex' flexDirection='column' gap={1.5}>
                                            <Box display='flex' justifyContent='space-between' alignItems='center'>
                                                <Typography variant='body2' color='text.secondary'>
                                                    Aktiflik
                                                </Typography>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={isActive}
                                                            onChange={e => setIsActive(e.target.checked)}
                                                            color='success'
                                                        />
                                                    }
                                                    label={isActive ? 'Aktif' : 'Pasif'}
                                                    sx={{ m: 0 }}
                                                />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default PurchaseLimitForm