'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

interface OrderTitleProps {
    orderNumber: string
    status: string
    statusText: string
    createdAt: string
}

const OrderTitle = ({ orderNumber, status, statusText, createdAt }: OrderTitleProps) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className='flex flex-wrap justify-between sm:items-center max-sm:flex-col gap-y-4'>
            <div className='flex flex-col items-start gap-1'>
                <div className='flex items-center gap-2'>
                    <Typography variant='h5'>Sipariş #{orderNumber}</Typography>
                </div>
                <Typography color='text.secondary'>{formatDate(createdAt)}</Typography>
            </div>
        </div>
    )
}

export default OrderTitle