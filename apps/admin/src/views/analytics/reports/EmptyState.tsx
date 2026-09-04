'use client'

// MUI Imports
import Typography from '@mui/material/Typography'

type EmptyStateProps = {
    message?: string
    minHeight?: number
}

// Kart içinde boş veri mesajı
const EmptyState = ({ message = 'Bu dönemde veri yok', minHeight = 120 }: EmptyStateProps) => {
    return (
        <div className='flex items-center justify-center is-full' style={{ minHeight }}>
            <Typography color='text.secondary'>{message}</Typography>
        </div>
    )
}

export default EmptyState
