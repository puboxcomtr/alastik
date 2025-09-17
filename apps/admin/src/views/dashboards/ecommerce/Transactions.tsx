// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ThemeColor } from '@core/types'

// Components Imports
import OptionMenu from '@core/components/option-menu'

type DataType = {
  avatarSrc: string
  title: string
  subtitle: string
  amount: string
  trend: 'up' | 'down'
  avatarColor?: ThemeColor
  height: number
}

// Vars
const data: DataType[] = [
  {
    title: 'Kredi Kartı (Tek Çekim)',
    amount: '512.224,25',
    height: 15
  },
  {
    title: 'Kredi Kartı (Taksitli)',
    amount: '5.124,52',
    height: 15
  },
  {
    title: 'Banka Hesabı - Ziraat Bankası',
    amount: '35.124,31',
    height: 15
  },
  {
    title: 'Banka Hesabı - Akbank',
    amount: '95.146,15',
    height: 15
  },
]

const Transactions = () => {
  return (
    <Card>
      <CardHeader
        title='Ödeme Yöntemleri'
        action={<OptionMenu iconClassName='text-textPrimary' options={['Last 28 Days', 'Last Month', 'Last Year']} />}
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
                <Typography color='text.primary' className='font-medium'>{`${
                  item.amount + " TL"
                }`}</Typography>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default Transactions
