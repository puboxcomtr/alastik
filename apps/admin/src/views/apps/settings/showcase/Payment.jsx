'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormLabel from '@mui/material/FormLabel'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { FormControl, Switch } from '@mui/material'

const Payment = ({ formData, setFormData }) => {
  return (
    <Card>
      <CardHeader title='Ödeme ve Fiyat Ayarları' />
      <CardContent>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl
              component='label'
              htmlFor='tax'
              className='font-medium'
              color='text.primary'>
              <div className='flex items-start gap-3'>
                <Switch
                  id="saleAgree"
                  checked={formData.saleAgree}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    saleAgree: e.target.checked
                  }))}
                />
                <div>
                  <FormLabel
                    component='label'
                    htmlFor='saleAgree'
                    className='text-base font-medium mb-1 cursor-pointer'
                  >
                    Satış Sözleşmesi Yayını
                  </FormLabel>
                  <Typography variant='caption' color='text.secondary' className='block'>
                    Son ödeme aşamasında kullanıcının okuyup kabul etmesi gereken Satış Sözleşmesini yayınlar.
                  </Typography>
                </div>
              </div>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl component='fieldset'>
              <div className='flex items-start gap-3'>
                <Switch
                  id="paymentSystem"
                  checked={formData.paymentSystem}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    paymentSystem: e.target.checked
                  }))}
                />
                <div>
                  <FormLabel
                    component='label'
                    htmlFor='paymentSystem'
                    className='text-base font-medium mb-1 cursor-pointer'
                  >
                    Ödeme Sistemi
                  </FormLabel>
                  <Typography variant='caption' color='text.secondary' className='block'>
                    Ürün satın almaksızın çalışabilen kredi kartı ödeme sistemini aktif/pasif hale getirir.
                  </Typography>
                </div>
              </div>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
    </Card>
  )
}

export default Payment