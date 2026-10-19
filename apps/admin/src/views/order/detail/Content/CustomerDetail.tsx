'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'

interface MemberInfo {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    createdAt: string
    orderCount: number
}

interface CustomerDetailProps {
    isGuest: boolean
    memberInfo: MemberInfo | null
}

const CustomerDetail = ({ isGuest, memberInfo }: CustomerDetailProps) => {
    if (isGuest || !memberInfo) {
        return null
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }

    return (
        <Card className='mt-5'>
            <CardContent className='flex flex-col gap-6'>
                <Typography variant='h5'>Üye Bilgileri</Typography>
                <div className='flex items-center gap-3'>
                    <Avatar>{getInitials(memberInfo.firstName, memberInfo.lastName)}</Avatar>
                    <div className='flex flex-col'>
                        <Typography color='text.primary' className='font-medium'>
                            {memberInfo.firstName} {memberInfo.lastName}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Üyelik Tarihi: {formatDate(memberInfo.createdAt)}
                        </Typography>
                    </div>
                </div>
                <div className='flex items-center gap-3'>
                    <Avatar>
                        <i className='ri-shopping-cart-2-line' />
                    </Avatar>
                    <Typography color='text.primary' className='font-medium'>
                        {memberInfo.orderCount} Sipariş
                    </Typography>
                </div>
                <div className='flex flex-col gap-1'>
                    <Typography color='text.primary' className='font-medium'>
                        İletişim Bilgileri
                    </Typography>
                    <Typography variant='body2'>Email: {memberInfo.email}</Typography>
                    <Typography variant='body2'>Telefon: {memberInfo.phone}</Typography>
                </div>
            </CardContent>
        </Card>
    )
}

export default CustomerDetail