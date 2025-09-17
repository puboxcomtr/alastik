// React Imports
import { useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import { InputAdornment } from '@mui/material'

// Component Imports
import DirectionalIcon from '@components/DirectionalIcon'

type Props = {
  activeStep: number
  isLastStep: boolean
  handleNext: () => void
  handlePrev: () => void
}

const Seo = ({ activeStep, isLastStep, handleNext, handlePrev }: Props) => {

  return (
    <Grid container spacing={5}>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          name='seo_title'
          autoComplete='off'
          label='SEO Başlığı'
          placeholder='SEO başlığı giriniz'
        />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField
          fullWidth
          name='seo_description'
          autoComplete='off'
          label='SEO Açıklaması'
          placeholder='SEO Açıklaması giriniz'
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 6 }}>
        <TextField
          fullWidth
          name='seo_url'
          autoComplete='off'
          label='URL'
          placeholder='URL Bağlantısı giriniz'
          InputProps={{
            startAdornment: (
              <InputAdornment
                sx={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  paddingX: 1,
                  color: 'gray',
                  fontSize: '0.9rem'
                }}
                position='start'
              >
                https://siteadi.com/etiket/
              </InputAdornment>
            )
          }}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 6 }}>
        <TextField
          fullWidth
          name='canonical_url'
          autoComplete='off'
          label='URL'
          placeholder='URL Bağlantısı giriniz'
          InputProps={{
            startAdornment: (
              <InputAdornment
                sx={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  paddingX: 1,
                  color: 'gray',
                  fontSize: '0.9rem'
                }}
                position='start'
              >
                https://siteadi.com/
              </InputAdornment>
            )
          }}
        />
      </Grid>
      <Grid size={{ xs: 12 }} className='flex items-center justify-between'>
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
          {isLastStep ? 'Submit' : 'Sonraki'}
        </Button>
      </Grid>
    </Grid>
  )
}

export default Seo
