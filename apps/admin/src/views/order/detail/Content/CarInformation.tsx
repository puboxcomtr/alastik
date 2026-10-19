'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

interface VehicleInfo {
    id: string
    make: string
    model: string
    year: number | null
    bodyType: string
    enginePower: string
    plateNumber: string
    mileage: number | null
    image: string | null
}

interface CarInformationProps {
    isGuest: boolean
    vehicleInfo: VehicleInfo | null
}

const CarInformation = ({ isGuest, vehicleInfo }: CarInformationProps) => {
    if (isGuest || !vehicleInfo) {
        return null
    }

    const formatMileage = (mileage: number) => {
        return new Intl.NumberFormat('tr-TR').format(mileage) + ' km'
    }

    return (
        <Card className='mt-5'>
            <CardContent className='flex flex-col gap-6'>
                <Typography variant='h5'>Araç Bilgileri</Typography>

                {vehicleInfo.image && (
                    <Box
                        component="img"
                        src={vehicleInfo.image}
                        width={200}
                        alt={`${vehicleInfo.make} ${vehicleInfo.model}`}
                        sx={{ display: 'block', mx: 'auto', borderRadius: 1 }}
                    />
                )}

                <div className='flex items-center gap-3'>
                    <div className='flex flex-col'>
                        <Typography color='text.primary' className='font-medium'>
                            {vehicleInfo.make} {vehicleInfo.model}
                        </Typography>
                        {vehicleInfo.year && (
                            <Typography variant='body2' color='text.secondary'>
                                Yıl: {vehicleInfo.year}
                            </Typography>
                        )}
                    </div>
                </div>

                {(vehicleInfo.bodyType || vehicleInfo.enginePower) && (
                    <div className='flex flex-col gap-1'>
                        <Typography color='text.primary' className='font-medium'>
                            Detaylı Bilgiler
                        </Typography>
                        {vehicleInfo.bodyType && (
                            <Typography variant='body2'>Motor: {vehicleInfo.bodyType}</Typography>
                        )}
                        {vehicleInfo.enginePower && (
                            <Typography variant='body2'>Güç: {vehicleInfo.enginePower}</Typography>
                        )}
                    </div>
                )}

                {(vehicleInfo.mileage || vehicleInfo.plateNumber) && (
                    <div className='flex flex-col gap-1'>
                        <Typography color='text.primary' className='font-medium'>
                            Ekstra Bilgiler
                        </Typography>
                        {vehicleInfo.mileage && (
                            <Typography variant='body2'>KM: {formatMileage(vehicleInfo.mileage)}</Typography>
                        )}
                        {vehicleInfo.plateNumber && (
                            <Typography variant='body2'>Plaka: {vehicleInfo.plateNumber}</Typography>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default CarInformation