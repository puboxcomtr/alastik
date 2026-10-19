import React, { useState } from 'react'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { FormControl, InputLabel, Select, MenuItem, OutlinedInput, Chip } from '@mui/material'

import DirectionalIcon from '@components/DirectionalIcon'

type Props = {
  activeStep: number
  isLastStep: boolean
  handleNext: () => void
  handlePrev: () => void
}

const options = ['0312358-25', '0312358-24', '0312340-24', '0312388-24', '0312393-25']

const Submit = ({ activeStep, isLastStep, handleNext, handlePrev }: Props) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const handleChange = (event: any) => {
    const {
      target: { value }
    } = event
    setSelectedServices(typeof value === 'string' ? value.split(',') : value)
  }

  return (
    <div className='flex flex-col gap-6'>
      <FormControl fullWidth>
        <InputLabel id='services-label'>Ürün Listesi</InputLabel>
        <Select
          labelId='services-label'
          multiple
          value={selectedServices}
          onChange={handleChange}
          input={<OutlinedInput label='Ürünleri Seçiniz' />}
          renderValue={(selected) => (
            <div className='flex gap-2 flex-wrap'>
              {(selected as string[]).map((value) => (
                <Chip key={value} label={value} />
              ))}
            </div>
          )}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div className='flex items-center justify-between'>
        <Button
          variant='outlined'
          color='secondary'
          disabled={activeStep === 0}
          onClick={handlePrev}
          startIcon={<DirectionalIcon ltrIconClass='ri-arrow-left-line' rtlIconClass='ri-arrow-right-line' />}
        >
          Önceki
        </Button>
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
          {isLastStep ? 'Kaydet' : 'Sonraki'}
        </Button>
      </div>
    </div>
  )
}

export default Submit
