import { useState } from 'react'
import type { ChangeEvent } from 'react'

import Radio from '@mui/material/Radio'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import DirectionalIcon from '@components/DirectionalIcon'

import CustomAvatar from '@core/components/mui/Avatar'

type Props = {
  activeStep: number
  isLastStep: boolean
  handleNext: () => void
  handlePrev: () => void
}

const Details = ({ activeStep, isLastStep, handleNext, handlePrev }: Props) => {
  const [value, setValue] = useState<string>('crm')

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value)
  }

  return (
    <div className='flex flex-col gap-6'>
      <TextField fullWidth label='Etiket Adı' placeholder='Lütfen geçerli etiket adı giriniz' required />
      <div className='flex flex-col gap-4'>
        <div onClick={() => setValue('top-left')} className='flex items-center justify-between cursor-pointer gap-4'>
          <div className='flex items-center gap-4'>
            <CustomAvatar variant='rounded' skin='light' color='info' size={46}>
              <i className='ri-anticlockwise-line' />
            </CustomAvatar>
            <div className='flex flex-col gap-1'>
              <Typography className='font-medium' color='text.primary'>
                Sol Üst
              </Typography>
              <Typography variant='body2'>Vitrin ürünlerinde; etiket konumunu belirleyiniz</Typography>
            </div>
          </div>
          <Radio value='top-left' onChange={handleChange} checked={value === 'top-left'} />
        </div>
        <div onClick={() => setValue('top-right')} className='flex items-center justify-between cursor-pointer gap-4'>
          <div className='flex items-center gap-4'>
            <CustomAvatar variant='rounded' skin='light' color='success' size={46}>
              <i className='ri-anticlockwise-2-line' />
            </CustomAvatar>
            <div className='flex flex-col gap-1'>
              <Typography className='font-medium' color='text.primary'>
                Sağ Üst
              </Typography>
              <Typography variant='body2'>Vitrin ürünlerinde; etiket konumunu belirleyiniz</Typography>
            </div>
          </div>
          <Radio value='top-right' onChange={handleChange} checked={value === 'top-right'} />
        </div>
        <div onClick={() => setValue('bottom-left')} className='flex items-center justify-between cursor-pointer gap-4'>
          <div className='flex items-center gap-4'>
            <CustomAvatar variant='rounded' skin='light' color='info' size={46}>
              <i className='ri-anticlockwise-line' />
            </CustomAvatar>
            <div className='flex flex-col gap-1'>
              <Typography className='font-medium' color='text.primary'>
                Sol Alt
              </Typography>
              <Typography variant='body2'>Vitrin ürünlerinde; etiket konumunu belirleyiniz</Typography>
            </div>
          </div>
          <Radio value='bottom-right' onChange={handleChange} checked={value === 'bottom-left'} />
        </div>
        <div onClick={() => setValue('bottom-right')} className='flex items-center justify-between cursor-pointer gap-4'>
          <div className='flex items-center gap-4'>
            <CustomAvatar variant='rounded' skin='light' color='success' size={46}>
              <i className='ri-anticlockwise-2-line' />
            </CustomAvatar>
            <div className='flex flex-col gap-1'>
              <Typography className='font-medium' color='text.primary'>
                Sağ Alt
              </Typography>
              <Typography variant='body2'>Vitrin ürünlerinde; etiket konumunu belirleyiniz</Typography>
            </div>
          </div>
          <Radio value='bottom-right' onChange={handleChange} checked={value === 'bottom-right'} />
        </div>
      </div>
      <div className='flex items-center justify-end'>
        <Button
          variant='contained'
          color={isLastStep ? 'success' : 'primary'}
          onClick={handleNext}
          endIcon={
            isLastStep ? (
              <i className='ri-check-line' />
            ) : (
              <DirectionalIcon ltrIconClass='ri-arrow-right-line' rtlIconClass='ri-arrow-left-line' />
            )
          }
        >
          {isLastStep ? 'Submit' : 'Sonraki'}
        </Button>
      </div>
    </div>
  )
}

export default Details
