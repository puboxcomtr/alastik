'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

interface MontagePoint {
    id: string
    name: string
    city: string
    district: string
    address: string
    phone: string
}

interface MontageInformationProps {
    montagePoints: MontagePoint[] | null
}

const MontageInformation = ({ montagePoints }: MontageInformationProps) => {
    // Siparişte montaj noktası yoksa gösterme
    if (!montagePoints || montagePoints.length === 0) {
        return null
    }

    return (
        <Card className='mt-5'>
            <CardContent className='flex flex-col gap-4'>
                <Typography variant='h5'>Montaj Noktası</Typography>

                {montagePoints.map(point => (
                    <div key={point.id} className='flex flex-col gap-1'>
                        <Typography color='text.primary' className='font-medium'>
                            {point.name}
                        </Typography>
                        {(point.district || point.city) && (
                            <Typography variant='body2' color='text.secondary'>
                                {[point.district, point.city].filter(Boolean).join(' / ')}
                            </Typography>
                        )}
                        {point.address && (
                            <Typography variant='body2'>{point.address}</Typography>
                        )}
                        {point.phone && (
                            <Typography variant='body2'>Tel: {point.phone}</Typography>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export default MontageInformation
