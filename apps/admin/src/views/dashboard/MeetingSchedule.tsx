import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import OptionMenu from '@core/components/option-menu'
import CustomAvatar from '@core/components/mui/Avatar'

const data = [
    {
        avatarSrc: '/images/avatars/4.png',
        title: 'Ahmet Yılmaz ile Görüşme',
        subtitle: '21 Eki | 08:20-10:30',
        chipLabel: 'İş',
        chipColor: 'primary'
    },
    {
        avatarSrc: '/images/avatars/8.png',
        title: 'Toplantı - Hilda',
        subtitle: '24 Eki | 11:30-12:00',
        chipLabel: 'Toplantı',
        chipColor: 'success'
    },
    {
        avatarSrc: '/images/avatars/5.png',
        title: 'Konferans Görüşmesi',
        subtitle: '28 Eki | 05:00-6:45',
        chipLabel: 'Akşam Yemeği',
        chipColor: 'warning'
    },
    {
        avatarSrc: '/images/avatars/3.png',
        title: 'Mark ile Toplantı',
        subtitle: '03 Ağu | 07:00-8:30',
        chipLabel: 'Buluşma',
        chipColor: 'secondary'
    }
]

const MeetingSchedule = () => {
    return (
        <Card>
            <CardHeader
                title='Toplantı Takvimi'
                action={<OptionMenu iconClassName='text-textPrimary' options={['Son 28 Gün', 'Geçen Ay', 'Geçen Yıl']} />}
            />
            <CardContent className='flex flex-col gap-3.5 lg:gap-8'>
                {data.map((item, index) => (
                    <div key={index} className='flex items-center gap-3'>
                        <CustomAvatar src={item.avatarSrc} size={38} />
                        <div className='flex justify-between items-center is-full flex-wrap gap-x-4 gap-y-2'>
                            <div className='flex flex-col gap-0.5'>
                                <Typography color='text.primary' className='font-medium'>
                                    {item.title}
                                </Typography>
                                <div className='flex items-center gap-2'>
                                    <i className='ri-calendar-line text-base text-textSecondary' />
                                    <Typography variant='body2'>{item.subtitle}</Typography>
                                </div>
                            </div>
                            <Chip label={item.chipLabel} color={item.chipColor} size='small' variant='tonal' />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export default MeetingSchedule