// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Components Imports
import OptionMenu from '@core/components/option-menu'

const data = [
    {
        title: 'Kredi Kartı (Tek Çekim)',
        amount: '512.224,25'
    },
    {
        title: 'Kredi Kartı (Taksitli)',
        amount: '5.124,52'
    },
    {
        title: 'Banka Hesabı - Ziraat Bankası',
        amount: '35.124,31'
    },
    {
        title: 'Banka Hesabı - Akbank',
        amount: '95.146,15'
    }
]

const Transactions = () => {
    return (
        <Card>
            <CardHeader
                title='Ödeme Yöntemleri'
                action={<OptionMenu iconClassName='text-textPrimary' options={['Son 28 Gün', 'Geçen Ay', 'Geçen Yıl']} />}
            />
            <CardContent className='flex flex-col gap-[1.1rem]'>
                {data.map((item, index) => (
                    <div key={index} className='flex items-center gap-4 border-b border-gray-200 pb-2'>
                        <div className='flex justify-between items-center is-full flex-wrap gap-x-4 gap-y-2'>
                            <div className='flex flex-col gap-0.5'>
                                <Typography color='text.primary' className='font-small'>
                                    {item.title}
                                </Typography>
                            </div>
                            <div className='flex gap-2 items-center'>
                                <Typography color='text.primary' className='font-medium'>
                                    {`${item.amount} TL`}
                                </Typography>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export default Transactions