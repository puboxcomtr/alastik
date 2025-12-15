// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

const CardStatVertical = ({ title, stats, avatarIcon, avatarColor, trendNumber, trend }) => {
    return (
        <Card className='bs-full'>
            <CardContent>
                <div className='flex justify-between items-center is-full mbe-5'>
                    <CustomAvatar color={avatarColor} skin='light' size={42} className='shadow-xs'>
                        <i className={avatarIcon} />
                    </CustomAvatar>
                    <OptionMenu
                        options={['Bugün', 'Son 7 Gün', 'Son 30 Gün']}
                        iconButtonProps={{ className: 'text-textPrimary' }}
                    />
                </div>
                <div className='flex flex-col gap-1'>
                    <Typography color='text.primary' className='text-md/6 text-gray-400'>
                        {title}
                    </Typography>
                    <div className='flex gap-x-2 gap-y-0.5 items-center flex-wrap'>
                        <Typography variant='h5'>{stats}</Typography>
                        <Typography color={trend === 'negative' ? 'error.main' : 'success.main'}>
                            {`${trend === 'negative' ? '-' : '+'}${trendNumber}`}
                        </Typography>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default CardStatVertical