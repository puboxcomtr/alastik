'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import InputAdornment from '@mui/material/InputAdornment'

// Third-party Imports
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

const MAX_DESI = 51

type DesiRange = {
    min: number
    max: number
    price: number
}

type CargoData = {
    id: string
    name: string
    desiPricing?: {
        ranges?: DesiRange[]
        extraPerDesi?: number
    }
}

type DesiPricingModalProps = {
    open: boolean
    cargo: CargoData | null
    handleClose: () => void
    onSuccess?: () => void
}

const DesiPricingModal = ({ open, cargo, handleClose, onSuccess }: DesiPricingModalProps) => {
    const [loading, setLoading] = useState(false)
    const [ranges, setRanges] = useState<DesiRange[]>([])
    const [extraPerDesi, setExtraPerDesi] = useState<number | ''>('')

    useEffect(() => {
        if (!open || !cargo) return

        setRanges(cargo.desiPricing?.ranges || [])
        setExtraPerDesi(cargo.desiPricing?.extraPerDesi ?? 0)
    }, [open, cargo])

    const handleAddRange = () => {
        const lastMax = ranges.length > 0 ? ranges[ranges.length - 1].max : 0
        if (lastMax >= MAX_DESI) {
            toast.error(`Desi aralıkları en fazla ${MAX_DESI}'ye kadar olabilir`)
            return
        }

        const newRange: DesiRange = {
            min: lastMax,
            max: Math.min(lastMax + 1, MAX_DESI),
            price: 0
        }
        setRanges([...ranges, newRange])
    }

    const handleRemoveRange = (index: number) => {
        setRanges(ranges.filter((_, i) => i !== index))
    }

    const handleRangeChange = (index: number, field: keyof DesiRange, value: number) => {
        const updated = [...ranges]
        updated[index] = { ...updated[index], [field]: value }
        setRanges(updated)
    }

    const validateRanges = (): string | null => {
        for (let i = 0; i < ranges.length; i++) {
            const r = ranges[i]
            if (r.max < r.min) {
                return 'Desi aralığı bitiş değeri başlangıçtan küçük olamaz'
            }
            if (i > 0 && r.min < ranges[i - 1].max) {
                return 'Desi aralıkları birbiriyle çakışamaz'
            }
            if (r.max > MAX_DESI) {
                return `Desi aralığı en fazla ${MAX_DESI} olabilir`
            }
        }
        return null
    }

    const handleSubmit = async () => {
        if (!cargo) return

        const validationError = validateRanges()
        if (validationError) {
            toast.error(validationError)
            return
        }

        const payload = {
            desiPricing: {
                ranges,
                extraPerDesi: extraPerDesi === '' ? 0 : Number(extraPerDesi)
            }
        }

        setLoading(true)
        try {
            const response = await fetchAPI(API_ENDPOINTS.cargo.update(cargo.id), {
                method: 'PUT',
                body: JSON.stringify(payload)
            })

            if (response?.success) {
                toast.success('Desi bazlı fiyatlandırma kaydedildi')
                onSuccess?.()
                handleClose()
            } else {
                toast.error(response?.message || 'Kaydedilemedi')
            }
        } catch (error: any) {
            console.error('Desi pricing update error:', error)
            toast.error('Kaydedilirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    if (!cargo) return null

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth scroll='body'>
            <DialogTitle className='flex items-center justify-between'>
                <Typography variant='h5' component='span'>
                    Desi Bazlı Fiyat Ayarları - {cargo.name}
                </Typography>
                <IconButton onClick={handleClose} size='small'>
                    <i className='ri-close-line' />
                </IconButton>
            </DialogTitle>
            <Divider />

            <DialogContent>
                <Box className='pbs-4'>
                    <Box className='relative' sx={{ paddingInlineStart: '40px' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                insetInlineStart: '15px',
                                insetBlockStart: '12px',
                                insetBlockEnd: '12px',
                                width: '2px',
                                bgcolor: 'divider'
                            }}
                        />

                        <Box className='flex items-center gap-4 mbe-6 relative'>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    insetInlineStart: '-33px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    bgcolor: 'success.main'
                                }}
                            />
                            <Typography variant='body1' className='font-medium'>
                                0 desi
                            </Typography>
                        </Box>

                        {ranges.map((range, index) => (
                            <Box
                                key={index}
                                className='flex items-center gap-3 mbe-6 relative flex-wrap'
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        insetInlineStart: '-33px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        bgcolor: 'info.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'white'
                                    }}
                                    onClick={() => handleRemoveRange(index)}
                                >
                                    <i className='ri-subtract-line text-[14px]' />
                                </Box>

                                <TextField
                                    size='small'
                                    type='number'
                                    label='Başlangıç'
                                    value={range.min}
                                    onChange={e => handleRangeChange(index, 'min', Number(e.target.value))}
                                    inputProps={{ min: 0, max: MAX_DESI }}
                                    sx={{ width: 110 }}
                                />
                                <Typography variant='body2'>ile</Typography>
                                <TextField
                                    size='small'
                                    type='number'
                                    label='Bitiş'
                                    value={range.max}
                                    onChange={e => handleRangeChange(index, 'max', Number(e.target.value))}
                                    inputProps={{ min: 0, max: MAX_DESI }}
                                    sx={{ width: 110 }}
                                />
                                <Typography variant='body2'>desi arası kargo</Typography>
                                <TextField
                                    size='small'
                                    type='number'
                                    label='Fiyat'
                                    value={range.price}
                                    onChange={e => handleRangeChange(index, 'price', Number(e.target.value))}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>TL</InputAdornment>
                                    }}
                                    sx={{ width: 140 }}
                                />
                            </Box>
                        ))}

                        <Box className='flex items-center gap-3 mbe-6 relative'>
                            <Tooltip title='Desi aralığı eklemek için tıklayın'>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        insetInlineStart: '-33px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        bgcolor: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'white'
                                    }}
                                    onClick={handleAddRange}
                                >
                                    <i className='ri-add-line text-[14px]' />
                                </Box>
                            </Tooltip>
                            <Typography variant='body2' color='primary'>
                                Desi aralığı eklemek için tıklayın
                            </Typography>
                        </Box>

                        <Box className='flex items-center gap-4 mbe-6 relative'>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    insetInlineStart: '-33px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    bgcolor: 'success.main'
                                }}
                            />
                            <Typography variant='body1' className='font-medium'>
                                {MAX_DESI} desi
                            </Typography>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}
                    >
                        <Tooltip title={`${MAX_DESI} desiyi geçen siparişlerde her ek desi için uygulanacak ek ücret`}>
                            <i className='ri-information-line text-[20px] text-textSecondary cursor-pointer' />
                        </Tooltip>
                        <Typography variant='body2'>+1 desi tutarı</Typography>
                        <TextField
                            size='small'
                            type='number'
                            value={extraPerDesi}
                            onChange={e => setExtraPerDesi(e.target.value === '' ? '' : Number(e.target.value))}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: 120 }}
                        />
                        <Typography variant='body2'>TL'dir.</Typography>
                    </Box>
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

export default DesiPricingModal