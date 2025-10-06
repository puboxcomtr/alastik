// MUI Imports
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import type { ButtonProps } from '@mui/material/Button'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { OrderType } from '@/types/apps/ecommerceTypes'

// Component Imports
import ConfirmationDialog from '@components/dialogs/confirmation-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'

type PayementStatusType = {
  text: string
  color: ThemeColor
}

type StatusChipColorType = {
  color: ThemeColor
}

export const paymentStatus: { [key: number]: PayementStatusType } = {
  1: { text: 'Paid', color: 'success' },
  2: { text: 'Pending', color: 'warning' },
  3: { text: 'Cancelled', color: 'secondary' },
  4: { text: 'Failed', color: 'error' }
}

// Backend'den gelen status değerleri ile uyumlu hale getirdik
export const statusChipColor: { [key: string]: StatusChipColorType } = {
  // Eski değerler
  Delivered: { color: 'success' },
  'Out for Delivery': { color: 'primary' },
  'Ready to Pickup': { color: 'info' },
  Dispatched: { color: 'warning' },
  // Yeni backend değerleri
  pending: { color: 'warning' },
  confirmed: { color: 'info' },
  processing: { color: 'primary' },
  shipped: { color: 'primary' },
  delivered: { color: 'success' },
  cancelled: { color: 'error' },
  returned: { color: 'secondary' },
  refunded: { color: 'secondary' }
}

const OrderDetailHeader = ({ orderData, order }: { orderData?: OrderType; order: string }) => {
  // Vars
  const buttonProps = (children: string, color: ThemeColor, variant: ButtonProps['variant']): ButtonProps => ({
    children,
    color,
    variant
  })

  // Güvenli erişim için default değer
  const statusColor = statusChipColor[orderData?.status || 'pending']?.color || 'warning'
  const paymentInfo = paymentStatus[orderData?.payment ?? 2] || { text: 'Pending', color: 'warning' }

  return (
    <div className='flex flex-wrap justify-between sm:items-center max-sm:flex-col gap-y-4'>
      <div className='flex flex-col items-start gap-1'>
        <div className='flex items-center gap-2'>
          <Typography variant='h5'>{`Order #${order}`}</Typography>
          <Chip
            variant='tonal'
            label={orderData?.status || 'pending'}
            color={statusColor}
            size='small'
          />
          <Chip
            variant='tonal'
            label={paymentInfo.text}
            color={paymentInfo.color}
            size='small'
          />
        </div>
        <Typography>{`${new Date(orderData?.date ?? '').toDateString()}`}</Typography>
      </div>
      <OpenDialogOnElementClick
        element={Button}
        elementProps={buttonProps('Delete Order', 'error', 'outlined')}
        dialog={ConfirmationDialog}
        dialogProps={{ type: 'delete-order' }}
      />
    </div>
  )
}

export default OrderDetailHeader