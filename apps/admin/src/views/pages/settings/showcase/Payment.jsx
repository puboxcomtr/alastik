'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormLabel from '@mui/material/FormLabel'
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { FormControl, Switch } from '@mui/material'
import { Form } from 'react-hook-form'

const Payment = () => {
  // States
  const [isCurrentPasswordShown, setIsCurrentPasswordShown] = useState(false)
  const [isConfirmPasswordShown, setIsConfirmPasswordShown] = useState(false)
  const [isNewPasswordShown, setIsNewPasswordShown] = useState(false)

  const handleClickShowCurrentPassword = () => {
    setIsCurrentPasswordShown(!isCurrentPasswordShown)
  }

  return (
    <Card>
      <CardHeader title='Ödeme ve Fiyat Ayarları' />
      <CardContent>
        <form>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl component={'fieldset'}>
                <div className='flex items-start gap-3'>
                  <Switch
                    id="priceShow"
                  >
                  </Switch>
                  <div>
                    <FormLabel
                      component='label'
                      htmlFor='priceShow'
                      className='text-base font-medium mb-1 cursor-pointer'
                    >
                      Fiyat Gösterimi
                    </FormLabel>
                    <Typography variant='caption' color='text.secondary' className='block'>
                      Üye girişi yapmayan kişilere fiyatların gösterilmesini veya gösterilmemesini sağlar.
                    </Typography>
                  </div>
                </div>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl component={'fieldset'}>
                <div className='flex items-start gap-3'>
                  <Switch
                    id="salesContract">
                  </Switch>
                  <div>
                    <FormLabel
                      component='label'
                      htmlFor='salesContract'
                      className='text-base font-medium mb-1 cursor-pointer'
                    >
                      Satış Sözleşmesi Yayını
                    </FormLabel>
                    <Typography variant='caption' color='text.secondary' className='block'>
                      Son ödeme aşamasında kullanıcının okuyup kabul etmesi gereken Satış Sözleşmesini yayınlar.                    </Typography>
                  </div>
                </div>
              </FormControl>
            </Grid>
          </Grid>
        </form>
      </CardContent>
      <Divider />
      <CardHeader title='Ürün Yönetimi' />
      <CardContent>
        <form>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl component={'fieldset'}>
                <div className='flex items-start gap-3'>
                  <Switch
                    id="letMe"
                  >
                  </Switch>
                  <div>
                    <FormLabel
                      component='label'
                      htmlFor='letMe'
                      className='text-base font-medium mb-1 cursor-pointer'
                    >
                      Fiyatı Düşünce 'Haber Ver' Butonu
                    </FormLabel>
                    <Typography variant='caption' color='text.secondary' className='block'>
                      Üye girişi yapmayan kişilere fiyatların gösterilmesini veya gösterilmemesini sağlar.
                    </Typography>
                  </div>
                </div>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl component={'fieldset'}>
                <div className='flex items-start gap-3'>
                  <Switch
                    id="salesContract">
                  </Switch>
                  <div>
                    <FormLabel
                      component='label'
                      htmlFor='salesContract'
                      className='text-base font-medium mb-1 cursor-pointer'
                    >
                      Satış Sözleşmesi Yayını
                    </FormLabel>
                    <Typography variant='caption' color='text.secondary' className='block'>
                      Son ödeme aşamasında kullanıcının okuyup kabul etmesi gereken Satış Sözleşmesini yayınlar.                    </Typography>
                  </div>
                </div>
              </FormControl>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>

  )
}

export default Payment
