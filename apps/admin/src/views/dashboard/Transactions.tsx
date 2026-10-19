import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

export type TransactionItem = {
    title: string
    amount: number
}

const formatTRY = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const Transactions = ({ items = [] }: { items?: TransactionItem[] }) => {
    return (
        <Card>
            <CardHeader title='Ödeme Yöntemleri' subheader='Son 28 Gün' />
            <CardContent className='flex flex-col gap-[1.1rem]'>
                {items.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>
                        Bu dönemde ödeme kaydı bulunmuyor
                    </Typography>
                )}
                {items.map((item, index) => (
                    <div key={index} className='flex items-center gap-4 border-b border-gray-200 pb-2'>
                        <div className='flex justify-between items-center is-full flex-wrap gap-x-4 gap-y-2'>
                            <div className='flex flex-col gap-0.5'>
                                <Typography color='text.primary' className='font-small'>
                                    {item.title}
                                </Typography>
                            </div>
                            <div className='flex gap-2 items-center'>
                                <Typography color='text.primary' className='font-medium'>
                                    {`${formatTRY(item.amount)} TL`}
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
