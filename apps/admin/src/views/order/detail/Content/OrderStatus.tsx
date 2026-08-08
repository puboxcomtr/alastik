'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Manuel tahsilat kanalları
const MANUAL_CHANNELS = [
    { value: 'paynet', label: 'Paynet' },
    { value: 'otopirpos', label: 'Otopirpos' },
    { value: 'nkolay', label: 'NKolay' }
]

interface OrderStatusProps {
    orderId: string
    status: string
    manualCollection?: { channel: string | null } | null
    onStatusChange?: (newStatus: string) => void
}

const OrderStatus = ({ orderId, status, manualCollection, onStatusChange }: OrderStatusProps) => {
    const initialChannel = manualCollection?.channel || ''
    const [collectionMode, setCollectionMode] = useState<'auto' | 'manual'>(initialChannel ? 'manual' : 'auto')
    const [channel, setChannel] = useState(initialChannel)

    const handleStatusChange = async (newStatus: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.orders.updateStatus(orderId), {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            })
            toast.success('Sipariş durumu güncellendi')
            onStatusChange?.(newStatus)
        } catch (error) {
            toast.error('Sipariş durumu güncellenirken hata oluştu')
        }
    }

    const saveChannel = async (newChannel: string | null) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.orders.manualCollection(orderId), {
                method: 'PUT',
                body: JSON.stringify({ channel: newChannel })
            })

            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.message || 'Manuel tahsilat bilgisi kaydedilemedi')
            }
        } catch (error) {
            toast.error('Manuel tahsilat bilgisi kaydedilemedi')
        }
    }

    const handleModeChange = (mode: 'auto' | 'manual') => {
        setCollectionMode(mode)

        // Otomatiğe dönülürse kayıtlı manuel kanal temizlenir
        if (mode === 'auto' && channel) {
            setChannel('')
            saveChannel(null)
        }
    }

    const handleChannelChange = (newChannel: string) => {
        setChannel(newChannel)
        saveChannel(newChannel)
    }

    return (
        <Card>
            <CardContent className='flex flex-col gap-6'>
                <Typography variant='h5'>Sipariş Durumu</Typography>
                <FormControl fullWidth size='small' variant='outlined'>
                    <Select
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        sx={{
                            minWidth: 150,
                            '& .MuiSelect-select': {
                                fontSize: '0.875rem',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center'
                            }
                        }}
                    >
                        <MenuItem value="pending">Onay Bekliyor</MenuItem>
                        <MenuItem value="confirmed">Onaylandı</MenuItem>
                        <MenuItem value="processing">Hazırlanıyor</MenuItem>
                        <MenuItem value="shipped">Kargoya Verildi</MenuItem>
                        <MenuItem value="delivered">Teslim Edildi</MenuItem>
                        <MenuItem value="cancelled">İptal Edildi</MenuItem>
                        <MenuItem value="returned">İade Edildi</MenuItem>
                        <MenuItem value="payment_failed">Başarısız</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth size='small' variant='outlined'>
                    <InputLabel id='collection-mode-label'>Tahsilat</InputLabel>
                    <Select
                        labelId='collection-mode-label'
                        label='Tahsilat'
                        value={collectionMode}
                        onChange={(e) => handleModeChange(e.target.value as 'auto' | 'manual')}
                    >
                        <MenuItem value='auto'>Otomatik (Site Üzerinden)</MenuItem>
                        <MenuItem value='manual'>Manuel</MenuItem>
                    </Select>
                </FormControl>

                {collectionMode === 'manual' && (
                    <FormControl fullWidth size='small' variant='outlined'>
                        <InputLabel id='manual-channel-label'>Tahsilat Kanalı</InputLabel>
                        <Select
                            labelId='manual-channel-label'
                            label='Tahsilat Kanalı'
                            value={channel}
                            onChange={(e) => handleChannelChange(e.target.value)}
                        >
                            {MANUAL_CHANNELS.map(c => (
                                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </CardContent>
        </Card>
    )
}

export default OrderStatus
