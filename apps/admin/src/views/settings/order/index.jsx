'use client'

import { useState, useEffect } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import CircularProgress from '@mui/material/CircularProgress'

import { toast } from 'react-toastify'

import { getSettings, updateSettings } from '@/utils/api/settings'

const Order = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    minimumOrderAmount: 0,
    autoOrderConfirm: false,
    guestCheckout: false,
    cartReminder: false,
    cartReminderTime: '1'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await getSettings('order')

      if (response.success) {
        setFormData({
          minimumOrderAmount: response.data.minimumOrderAmount || 0,
          autoOrderConfirm: response.data.autoOrderConfirm || false,
          guestCheckout: response.data.guestCheckout || false,
          cartReminder: response.data.cartReminder || false,
          cartReminderTime: response.data.cartReminderTime || '1'
        })
      }
    } catch (error) {
      toast.error('Ayarlar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await updateSettings('order', formData)
      toast.success('Ayarlar kaydedildi')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ayarlar kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className='flex justify-center items-center p-10'>
            <CircularProgress />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl component='fieldset' fullWidth>
                <div className='flex flex-col gap-3'>
                  <TextField
                    fullWidth
                    type='number'
                    label='Minimum Sipariş Tutarı'
                    placeholder='Örn: 100'
                    value={formData.minimumOrderAmount}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minimumOrderAmount: Number(e.target.value)
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position='start'>₺</InputAdornment>
                    }}
                  />
                </div>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl component='fieldset'>
                <div className='flex items-start gap-3'>
                  <Switch
                    id='autoOrderConfirm'
                    checked={formData.autoOrderConfirm}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      autoOrderConfirm: e.target.checked
                    }))}
                  />
                  <div>
                    <FormLabel
                      component='label'
                      htmlFor='autoOrderConfirm'
                      className='text-base font-medium mb-1 cursor-pointer'
                    >
                      Otomatik Sipariş Onayı
                    </FormLabel>
                    <Typography variant='caption' color='text.secondary' className='block'>
                      Siparişler otomatik olarak onaylanır ve müşteriye bildirim gönderilir
                    </Typography>
                  </div>
                </div>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl component='fieldset'>
                <div className='flex items-start gap-3'>
                  <Switch
                    id='guestCheckout'
                    checked={formData.guestCheckout}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guestCheckout: e.target.checked
                    }))}
                  />
                  <div>
                    <FormLabel
                      component='label'
                      htmlFor='guestCheckout'
                      className='text-base font-medium mb-1 cursor-pointer'>
                      Üyeliksiz Alışveriş
                    </FormLabel>
                    <Typography variant='caption' color='text.secondary' className='block'>
                      Site ziyaretçilerinizin sitenize üye olmadan alışveriş yapabilmeleri için bu özelliği aktif edebilirsiniz.
                    </Typography>
                  </div>
                </div>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Sepet Hatırlatma</InputLabel>
                <Select
                  label='Sepet Hatırlatma'
                  value={formData.cartReminderTime}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    cartReminderTime: e.target.value
                  }))}
                >
                  <MenuItem value='20min'>20 Dakika</MenuItem>
                  <MenuItem value='30min'>30 Dakika</MenuItem>
                  <MenuItem value='45min'>45 Dakika</MenuItem>
                  <MenuItem value='1'>1 Saat</MenuItem>
                  <MenuItem value='3'>3 Saat</MenuItem>
                  <MenuItem value='6'>6 Saat</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl component='fieldset'>
                <div className='flex items-start gap-3'>
                  <Switch
                    id="cartReminder"
                    checked={formData.cartReminder}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      cartReminder: e.target.checked
                    }))}
                  />
                  <div>
                    <FormLabel
                      component='label'
                      htmlFor='cartReminder'
                      className='text-base font-medium mb-1 cursor-pointer'>
                      Otomatik Sepet Hatırlatma
                    </FormLabel>
                    <Typography variant='caption' color='text.secondary' className='block'>
                      Sepetinde ürün bulunan fakat henüz alışverişlerini tamamlamamış müşterilerinizi takip edebilirsiniz.
                    </Typography>
                  </div>
                </div>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }} className='flex gap-4 flex-wrap' container justifyContent='flex-end'>
              <Button
                variant='contained'
                type='submit'
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default Order