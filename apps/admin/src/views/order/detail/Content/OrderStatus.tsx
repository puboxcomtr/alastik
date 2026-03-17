'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

interface OrderStatusProps {
    orderId: string
    status: string
    onStatusChange?: (newStatus: string) => void
}

const OrderStatus = ({ orderId, status, onStatusChange }: OrderStatusProps) => {

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
            </CardContent>
        </Card>
    )
}

export default OrderStatus