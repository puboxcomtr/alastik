'use client'

import { useState, useEffect } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import type { SelectChangeEvent } from '@mui/material/Select'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'

import { CARGO_PROVIDERS } from '@/data/cargo/providers'
import type { CargoProductType } from './cargoOptions'

type MemberGroupType = 'member' | 'guest' | 'all'

type AddCargoModalProps = {
    open: boolean
    handleClose: () => void
    onSuccess?: () => void
    existingCodes?: string[]
}

const MEMBER_GROUP_OPTIONS: { value: MemberGroupType; label: string }[] = [
    { value: 'member', label: 'Üyeler' },
    { value: 'guest', label: 'Misafir' },
    { value: 'all', label: 'Tümü' }
]

const AddCargoModal = ({ open, handleClose, onSuccess, existingCodes = [] }: AddCargoModalProps) => {
    const [loading, setLoading] = useState(false)
    const [logoUploading, setLogoUploading] = useState(false)

    const [selectedProvider, setSelectedProvider] = useState('')
    const [isActive, setIsActive] = useState<'active' | 'passive'>('active')
    const [webOrder, setWebOrder] = useState<number | ''>('')
    const [memberGroups, setMemberGroups] = useState<MemberGroupType[]>([])
    const [logo, setLogo] = useState('')
    const [productType, setProductType] = useState<CargoProductType>('dia_api')
    const [paymentType, setPaymentType] = useState<'sender' | 'receiver'>('sender')
    const [fixedPrice, setFixedPrice] = useState<number | ''>('')
    const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | ''>('')
    const [freeShippingDesiLimit, setFreeShippingDesiLimit] = useState<number | ''>('')
    useEffect(() => {
        if (!open) return

        setSelectedProvider('')
        setIsActive('active')
        setWebOrder('')
        setMemberGroups([])
        setLogo('')
        setProductType('dia_api')
        setPaymentType('sender')
        setFixedPrice('')
        setFreeShippingThreshold('')
        setFreeShippingDesiLimit('')
    }, [open])

    const availableProviders = CARGO_PROVIDERS.filter(
        provider => !existingCodes.includes(provider.code)
    )

    const handleMemberGroupsChange = (event: SelectChangeEvent<MemberGroupType[]>) => {
        const value = event.target.value
        setMemberGroups(typeof value === 'string' ? (value.split(',') as MemberGroupType[]) : value)
    }

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Lütfen geçerli bir resim dosyası seçiniz')
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo boyutu en fazla 2MB olabilir')
            return
        }

        setLogoUploading(true)
        try {
            const formData = new FormData()
            formData.append('files', file)

            const result = await fetchAPI(API_ENDPOINTS.media.upload('general'), {
                method: 'POST',
                body: formData
            })

            const uploadedUrl = result?.files?.[0]?.url || ''

            if (!uploadedUrl) {
                throw new Error('Yüklenen logo URL alınamadı')
            }

            setLogo(uploadedUrl)
            toast.success('Logo yüklendi')
        } catch (error) {
            console.error('Logo upload error:', error)
            toast.error('Logo yüklenirken hata oluştu')
        } finally {
            setLogoUploading(false)
        }
    }

    const handleRemoveLogo = () => {
        setLogo('')
    }

    const handleSubmit = async () => {
        if (!selectedProvider) {
            toast.error('Kargo firması seçiniz')
            return
        }

        const provider = CARGO_PROVIDERS.find(p => p.code === selectedProvider)
        if (!provider) {
            toast.error('Geçersiz kargo firması')
            return
        }

        if (memberGroups.length === 0) {
            toast.error('En az bir üye grubu seçiniz')
            return
        }

        if (fixedPrice === '' || Number(fixedPrice) < 0) {
            toast.error('Sabit fiyat zorunludur')
            return
        }

        if (freeShippingThreshold === '' || Number(freeShippingThreshold) < 0) {
            toast.error('Ücretsiz kargo tutarı zorunludur')
            return
        }

        if (freeShippingDesiLimit === '' || Number(freeShippingDesiLimit) < 0) {
            toast.error('Ücretsiz kargo desi limiti zorunludur')
            return
        }

        const payload = {
            name: provider.name,
            code: provider.code,
            isActive: isActive === 'active',
            webOrder: webOrder === '' ? 0 : Number(webOrder),
            memberGroups,
            logo,
            productType,
            paymentType,
            fixedPrice: Number(fixedPrice),
            freeShippingThreshold: Number(freeShippingThreshold),
            freeShippingDesiLimit: Number(freeShippingDesiLimit)
        }

        setLoading(true)
        try {
            const response = await fetchAPI(API_ENDPOINTS.cargo.create(), {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            if (response?.success) {
                toast.success(response.message || 'Kargo firması başarıyla eklendi')
                onSuccess?.()
                handleClose()
            } else {
                toast.error(response?.message || 'Kargo firması eklenemedi')
            }
        } catch (error: any) {
            console.error('Cargo create error:', error)
            toast.error(error?.message || 'Kargo firması eklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth scroll='body'>
            <DialogTitle className='flex items-center justify-between'>
                <Typography variant='h5' component='span'>
                    Kargo Firması Ekle
                </Typography>
                <IconButton onClick={handleClose} size='small'>
                    <i className='ri-close-line' />
                </IconButton>
            </DialogTitle>
            <Divider />

            <DialogContent>
                <Box className='flex flex-col gap-5 pbs-4'>
                    <FormControl fullWidth required>
                        <InputLabel>Kargo Firması</InputLabel>
                        <Select
                            label='Kargo Firması'
                            value={selectedProvider}
                            onChange={e => setSelectedProvider(e.target.value)}
                        >
                            {availableProviders.length === 0 ? (
                                <MenuItem disabled value=''>
                                    Eklenecek kargo firması kalmadı
                                </MenuItem>
                            ) : (
                                availableProviders.map(provider => (
                                    <MenuItem key={provider.code} value={provider.code}>
                                        {provider.name}
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth required>
                        <InputLabel>Durum</InputLabel>
                        <Select
                            label='Durum'
                            value={isActive}
                            onChange={e => setIsActive(e.target.value as 'active' | 'passive')}
                        >
                            <MenuItem value='active'>Aktif</MenuItem>
                            <MenuItem value='passive'>Pasif</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label='Sıra'
                        type='number'
                        placeholder='0'
                        value={webOrder}
                        onChange={e => setWebOrder(e.target.value === '' ? '' : Number(e.target.value))}
                        inputProps={{ min: 0 }}
                    />

                    <FormControl fullWidth required>
                        <InputLabel>Üye Grubu</InputLabel>
                        <Select
                            multiple
                            label='Üye Grubu'
                            value={memberGroups}
                            onChange={handleMemberGroupsChange}
                            input={<OutlinedInput label='Üye Grubu' />}
                            renderValue={selected => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map(value => {
                                        const option = MEMBER_GROUP_OPTIONS.find(opt => opt.value === value)
                                        return <Chip key={value} label={option?.label} size='small' />
                                    })}
                                </Box>
                            )}
                        >
                            {MEMBER_GROUP_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box>
                        <Typography variant='body2' className='mbe-2'>
                            Logo
                        </Typography>
                        <Box className='flex items-center gap-4'>
                            <Avatar
                                src={logo ? getImageUrl(logo) : ''}
                                variant='rounded'
                                sx={{ width: 64, height: 64, bgcolor: 'action.hover' }}
                            >
                                <i className='ri-truck-line text-textSecondary text-2xl' />
                            </Avatar>
                            <Box className='flex flex-col gap-2'>
                                <Button
                                    component='label'
                                    variant='outlined'
                                    size='small'
                                    startIcon={
                                        logoUploading ? (
                                            <CircularProgress size={16} />
                                        ) : (
                                            <i className='ri-upload-2-line' />
                                        )
                                    }
                                    disabled={logoUploading}
                                >
                                    Logo Yükle
                                    <input type='file' hidden accept='image/*' onChange={handleLogoUpload} />
                                </Button>
                                {logo && (
                                    <Button
                                        variant='text'
                                        size='small'
                                        color='error'
                                        onClick={handleRemoveLogo}
                                        startIcon={<i className='ri-delete-bin-line' />}
                                    >
                                        Kaldır
                                    </Button>
                                )}
                            </Box>
                        </Box>
                        <Typography variant='caption' color='text.secondary' className='mbs-2 block'>
                            Maksimum 2MB, PNG/JPG formatı
                        </Typography>
                    </Box>

                    <Divider />

                    <FormControl fullWidth required>
                        <InputLabel>Ödeme Tipi</InputLabel>
                        <Select
                            label='Ödeme Tipi'
                            value={paymentType}
                            onChange={e => setPaymentType(e.target.value as 'sender' | 'receiver')}
                        >
                            <MenuItem value='sender'>Gönderici Ödemeli</MenuItem>
                            <MenuItem value='receiver'>Alıcı Ödemeli</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        required
                        label='Sabit Fiyat'
                        type='number'
                        placeholder='0.00'
                        value={fixedPrice}
                        onChange={e => setFixedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <Typography variant='body2' color='text.secondary' className='mie-2'>
                                        TL
                                    </Typography>
                                    <Tooltip
                                        title='Her sipariş için aynı değer üzerinden ücretlendirme yapacaksanız, sabit bir kargo fiyatı girebilirsiniz. Sabit fiyat ile desi bazlı fiyatlandırmayı aynı anda aktif etmeniz durumunda belirlediğiniz sabit fiyat, otomatik olarak desi değerleri için girdiğiniz fiyatlara eklenecektir.'
                                        arrow
                                        placement='top'
                                    >
                                        <i className='ri-information-line text-[20px] text-textSecondary cursor-pointer' />
                                    </Tooltip>
                                </InputAdornment>
                            )
                        }}
                    />

                    <TextField
                        fullWidth
                        required
                        label='Ücretsiz Kargo Tutarı'
                        type='number'
                        placeholder='0.00'
                        value={freeShippingThreshold}
                        onChange={e => setFreeShippingThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <Typography variant='body2' color='text.secondary' className='mie-2'>
                                        TL
                                    </Typography>
                                    <Tooltip
                                        title='Minimum bir alışveriş limiti belirleyerek bu limitin üzerinde alışveriş yapan müşterilerinize ücretsiz kargo seçeneği sunabilirsiniz. (Örn: 100 TL üzeri ücretsiz kargo!)'
                                        arrow
                                        placement='top'
                                    >
                                        <i className='ri-information-line text-[20px] text-textSecondary cursor-pointer' />
                                    </Tooltip>
                                </InputAdornment>
                            )
                        }}
                    />

                    <TextField
                        fullWidth
                        required
                        label='Ücretsiz Kargo Desi Limiti'
                        type='number'
                        placeholder='0'
                        value={freeShippingDesiLimit}
                        onChange={e => setFreeShippingDesiLimit(e.target.value === '' ? '' : Number(e.target.value))}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <Typography variant='body2' color='text.secondary' className='mie-2'>
                                        desi
                                    </Typography>
                                    <Tooltip
                                        title='Maksimum bir desi miktarı belirleyerek ilgili desi miktarının üzerindeki alışverişler için ücretsiz kargo seçeneğinizi limitlendirebilirsiniz. Satın alınan ürünlerin toplam desi miktarı ücretsiz kargo desi limitinizden fazlaysa, sipariş tutarına +desi ücreti yansıtılır. (Örn: 30 desiye kadar 100 TL üzeri ücretsiz kargo!)'
                                        arrow
                                        placement='top'
                                    >
                                        <i className='ri-information-line text-[20px] text-textSecondary cursor-pointer' />
                                    </Tooltip>
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>
            </DialogContent>

            <Divider />
            <DialogActions className='p-5'>
                <Button onClick={handleClose} variant='outlined' color='secondary' disabled={loading}>
                    İptal
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant='contained'
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color='inherit' /> : null}
                >
                    Kaydet
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default AddCargoModal