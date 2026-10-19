'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormLabel from '@mui/material/FormLabel'
import Typography from '@mui/material/Typography'
import { FormControl, Switch } from '@mui/material'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'
import { getSettings, updateSettings } from '@/utils/api/settings'

const Notifications = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    promotion: false,
    giftCoupon: false,
    pointSystem: false,
    inviteSystem: false
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await getSettings('campaign')

      if (response.success) {
        setFormData({
          promotion: response.data.promotion || false,
          giftCoupon: response.data.giftCoupon || false,
          pointSystem: response.data.pointSystem || false,
          inviteSystem: response.data.inviteSystem || false
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

      const dataToSave = {
        promotion: formData.promotion,
        giftCoupon: formData.giftCoupon,
        pointSystem: formData.pointSystem,
        inviteSystem: formData.inviteSystem
      }

      await updateSettings('campaign', dataToSave)

      toast.success('Kampanya ayarları kaydedildi')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ayarlar kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Kampanya Yönetimi' />
            <CardContent>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl component='fieldset'>
                    <div className="flex items-start gap-3">
                      <Switch
                        id="promotion"
                        checked={formData.promotion}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          promotion: e.target.checked
                        }))}
                      />
                      <div>
                        <FormLabel
                          component='label'
                          htmlFor='promotion'
                          className='text-base font-medium mb-1 cursor-pointer'
                        >
                          Promosyon Sistemi
                        </FormLabel>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          Promosyon Sistemi kullanımını açar veya kapatır.
                        </Typography>
                      </div>
                    </div>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl component='fieldset'>
                    <div className="flex items-start gap-3">
                      <Switch
                        id="giftCoupon"
                        checked={formData.giftCoupon}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          giftCoupon: e.target.checked
                        }))}
                      />
                      <div>
                        <FormLabel
                          component='label'
                          htmlFor='giftCoupon'
                          className='text-base font-medium mb-1 cursor-pointer'
                        >
                          Hediye Çeki Sistemi
                        </FormLabel>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          Sistemde hediye çeki kullanımını açar veya kapatır.
                        </Typography>
                      </div>
                    </div>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl component='fieldset'>
                    <div className="flex items-start gap-3">
                      <Switch
                        id="pointSystem"
                        checked={formData.pointSystem}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          pointSystem: e.target.checked
                        }))}
                      />
                      <div>
                        <FormLabel
                          component='label'
                          htmlFor='pointSystem'
                          className='text-base font-medium mb-1 cursor-pointer'
                        >
                          Puan Sistemi
                        </FormLabel>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          Puan sistemi tek başına kullanılamaz. Kişi kazandığı puanları harcamak için hediye çekine dönüştürmelidir.
                        </Typography>
                      </div>
                    </div>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl component='fieldset'>
                    <div className="flex items-start gap-3">
                      <Switch
                        id="inviteSystem"
                        checked={formData.inviteSystem}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          inviteSystem: e.target.checked
                        }))}
                      />
                      <div>
                        <FormLabel
                          component='label'
                          htmlFor='inviteSystem'
                          className='text-base font-medium mb-1 cursor-pointer'
                        >
                          Davet Sistemi
                        </FormLabel>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          Davet sistemi tek başına kullanılamaz. Davet sistemi ile puan kazanımı ayarlandığı için, 'Puan Sistemi' de aktif edilmelidir.
                        </Typography>
                      </div>
                    </div>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }} className='flex gap-4 flex-wrap justify-end'>
                  <Button
                    variant='contained'
                    type='submit'
                    disabled={saving}
                  >
                    {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  )
}

export default Notifications