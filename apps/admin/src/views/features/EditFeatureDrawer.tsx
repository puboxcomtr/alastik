'use client'

import { useEffect, useState } from 'react'

/* MUI */
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

/* Toast */
import { toast } from 'react-toastify'

type FeatureValueType = {
    _id: string
    featureValue: string
    featureValueOrder: number
    productCount: number
    isActive: boolean
}

type FeatureType = {
    _id: string
    name: string
    valueCount: number
    isActive: boolean
    order: number
    displayLocation?: string
    productCount?: number
}

type Props = {
    open: boolean
    handleClose: () => void
    selectedFeature: FeatureType | null
    onUpdate: () => void
}

const EditFeatureDrawer = ({ open, handleClose, selectedFeature, onUpdate }: Props) => {
    const [isLoading, setIsLoading] = useState(false)
    const [loadingValues, setLoadingValues] = useState(false)
    const [featureValues, setFeatureValues] = useState<FeatureValueType[]>([])
    const [formData, setFormData] = useState({
        displayLocation: 'both',
        featureGroupOrder: 0,
        isActive: true
    })

    useEffect(() => {
        if (selectedFeature && open) {
            setFormData({
                displayLocation: selectedFeature.displayLocation || 'both',
                featureGroupOrder: selectedFeature.order || 0,
                isActive: selectedFeature.isActive !== undefined ? selectedFeature.isActive : true
            })

            // Değerleri yükle
            loadFeatureValues(selectedFeature.name)
        }
    }, [selectedFeature, open])

    const loadFeatureValues = async (featureName: string) => {
        try {
            setLoadingValues(true)
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
            const response = await fetch(`${baseUrl}/features/${encodeURIComponent(featureName)}`)

            if (!response.ok) throw new Error('Değerler yüklenemedi')

            const result = await response.json()

            if (result.success && result.data.values) {
                // Değerleri sırala
                const sortedValues = result.data.values.sort((a: FeatureValueType, b: FeatureValueType) => {
                    return a.featureValueOrder - b.featureValueOrder
                })
                setFeatureValues(sortedValues)
            }
        } catch (error) {
            toast.error('Özellik değerleri yüklenemedi')
        } finally {
            setLoadingValues(false)
        }
    }

    const handleValueOrderChange = (valueId: string, newOrder: number) => {
        setFeatureValues(prev =>
            prev.map(val =>
                val._id === valueId ? { ...val, featureValueOrder: newOrder } : val
            )
        )
    }

    const onSubmit = async () => {
        if (!selectedFeature || isLoading) return

        setIsLoading(true)

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

            // 1. Grup ayarlarını güncelle
            const groupResponse = await fetch(`${baseUrl}/features/${encodeURIComponent(selectedFeature.name)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!groupResponse.ok) throw new Error('Grup güncellenemedi')

            // 2. Her değerin sıralamasını güncelle
            const valueUpdatePromises = featureValues.map(value =>
                fetch(`${baseUrl}/features/${encodeURIComponent(selectedFeature.name)}/value/${value._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ featureValueOrder: value.featureValueOrder })
                })
            )

            await Promise.all(valueUpdatePromises)

            toast.success(`"${selectedFeature.name}" özelliği güncellendi`)
            onUpdate()
            handleClose()
        } catch (error) {
            toast.error('Güncelleme başarısız')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDiscard = () => {
        handleClose()
    }

    return (
        <Drawer
            open={open}
            anchor='right'
            variant='temporary'
            onClose={handleDiscard}
            ModalProps={{ keepMounted: true }}
            sx={{
                '& .MuiDrawer-paper': {
                    width: { xs: 300, sm: 500 },
                    zIndex: 1200
                }
            }}
        >
            <div className='flex items-center justify-between pli-5 plb-4'>
                <Typography variant='h5'>Özellik Detayları</Typography>
                <IconButton size='small' onClick={handleDiscard}>
                    <i className='ri-close-line text-2xl' />
                </IconButton>
            </div>
            <Divider />

            <div className='p-5'>
                <form onSubmit={(e) => {
                    e.preventDefault()
                    onSubmit()
                }} className='flex flex-col gap-5'>

                    {/* Özellik Adı + Grup Önceliği */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            label='Özellik Adı'
                            value={selectedFeature?.name || ''}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            type='number'
                            label='Öncelik'
                            value={formData.featureGroupOrder}
                            onChange={(e) => setFormData({ ...formData, featureGroupOrder: Number(e.target.value) })}
                            sx={{ width: 120 }}
                            disabled={isLoading}
                        />
                    </Box>

                    <Divider />

                    {/* Değerler Listesi */}
                    <Typography variant='h6'>Özellik Değerleri</Typography>

                    {loadingValues ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={30} />
                        </Box>
                    ) : (
                        <Box sx={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {featureValues.map((value) => (
                                <Box
                                    key={value._id}
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        alignItems: 'center',
                                        p: 2,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 1
                                    }}
                                >
                                    <TextField
                                        fullWidth
                                        label='Özellik Değer'
                                        value={value.featureValue}
                                        InputProps={{ readOnly: true }}
                                        size='small'
                                    />
                                    <TextField
                                        type='number'
                                        label='Öncelik'
                                        value={value.featureValueOrder}
                                        onChange={(e) => handleValueOrderChange(value._id, Number(e.target.value))}
                                        sx={{ width: 100 }}
                                        size='small'
                                        disabled={isLoading}
                                    />
                                </Box>
                            ))}
                        </Box>
                    )}

                    <Divider />

                    {/* Görünüm Yeri */}
                    <FormControl fullWidth disabled={isLoading}>
                        <InputLabel>Görünüm Yeri</InputLabel>
                        <Select
                            value={formData.displayLocation}
                            label='Görünüm Yeri'
                            onChange={(e) => setFormData({ ...formData, displayLocation: e.target.value })}
                        >
                            <MenuItem value='product_detail'>Sadece Ürün Detay</MenuItem>
                            <MenuItem value='filter'>Sadece Filtre</MenuItem>
                            <MenuItem value='both'>Ürün Detay + Filtre</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Aktif/Pasif */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                disabled={isLoading}
                            />
                        }
                        label='Aktif'
                    />

                    <Divider />

                    {/* Butonlar */}
                    <div className='flex items-center gap-4'>
                        <Button
                            variant='contained'
                            type='submit'
                            disabled={isLoading || loadingValues}
                        >
                            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                        <Button
                            variant='outlined'
                            color='error'
                            onClick={handleDiscard}
                            disabled={isLoading}
                        >
                            Vazgeç
                        </Button>
                    </div>
                </form>
            </div>
        </Drawer>
    )
}

export default EditFeatureDrawer