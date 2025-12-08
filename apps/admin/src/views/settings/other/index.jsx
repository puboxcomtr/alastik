// apps/admin/src/views/pages/settings/connections/index.jsx
'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { FormControl, Select, Switch } from '@mui/material'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'
import { getSettings, updateSettings } from '@/utils/api/settings'

const Connections = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    // Site Ek Ayarları
    tax: false,
    personalData: false,
    postCode: false,
    
    // Site Genel Ayarları
    siteStatus: '0'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await getSettings('connections')

      if (response.success) {
        setFormData({
          tax: response.data.tax || false,
          personalData: response.data.personalData || false,
          postCode: response.data.postCode || false,
          siteStatus: response.data.siteStatus || '0'
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
        tax: formData.tax,
        personalData: formData.personalData,
        postCode: formData.postCode,
        siteStatus: formData.siteStatus
      }

      await updateSettings('connections', dataToSave)

      toast.success('Ayarlar kaydedildi')
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
      <Card>
        <Grid container>
          <Grid size={{ xs: 12, md: 6 }}>
            <CardHeader
              title='Site Ek Ayarları'
              subheader='Sitenize ait ek ayarları görüntüleyebilir veya düzenleyebilirsiniz.'
            />
            <Divider />
            <CardContent>
              <Grid container spacing={6}>
                <Grid size={{ sm: 12 }}>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex flex-grow items-center gap-4'>
                      <div className='flex-grow'>
                        <FormControl
                          component='label'
                          htmlFor='tax'
                          className='font-medium'
                          sx={{
                            color: 'text.primary',
                            cursor: 'pointer'
                          }}
                        >
                          TC Kimlik Numarası Gerekliliği
                        </FormControl>
                        <Typography variant='body2'>
                          Adres bilgilerinin eklenme aşamasında TC kimlik no zorunlu tutmak isterseniz bu özelliği açabilirsiniz.
                        </Typography>
                      </div>
                    </div>
                    <Switch 
                      id="tax"
                      checked={formData.tax}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        tax: e.target.checked
                      }))}
                    />
                  </div>
                </Grid>
                
                <Grid size={{ sm: 12 }}>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex flex-grow items-center gap-4'>
                      <div className='flex-grow'>
                        <FormControl
                          component='label'
                          htmlFor='personalData'
                          className='font-medium'
                          sx={{
                            color: 'text.primary',
                            cursor: 'pointer'
                          }}
                        >
                          Kişisel Verilerin Korunması Kanunu
                        </FormControl>
                        <Typography variant='body2'>
                          Adres bilgilerinin eklenme aşamasında TC kimlik no zorunlu tutmak isterseniz bu özelliği açabilirsiniz.
                        </Typography>
                      </div>
                    </div>
                    <Switch 
                      id="personalData"
                      checked={formData.personalData}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        personalData: e.target.checked
                      }))}
                    />
                  </div>
                </Grid>
                
                <Grid size={{ sm: 12 }}>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex flex-grow items-center gap-4'>
                      <div className='flex-grow'>
                        <FormControl
                          component='label'
                          htmlFor='postCode'
                          className='font-medium'
                          sx={{
                            color: 'text.primary',
                            cursor: 'pointer'
                          }}
                        >
                          Posta Kodu Kullanımı
                        </FormControl>
                        <Typography variant='body2'>
                          Adres bilgilerinin eklenme aşamasında posta kodu alanının kullanımını belirler.
                        </Typography>
                      </div>
                    </div>
                    <Switch 
                      id="postCode"
                      checked={formData.postCode}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        postCode: e.target.checked
                      }))}
                    />
                  </div>
                </Grid>
              </Grid>
            </CardContent>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <CardHeader
              title='Site Genel Ayarları'
              subheader='Sitenize ait genel ayarları görüntüleyebilir veya düzenleyebilirsiniz.' 
            />
            <Divider />
            <CardContent className='flex flex-col gap-4'>
              <Grid container spacing={6}>
                <Grid size={{ sm: 6 }}>
                  <FormControl
                    component='label'
                    htmlFor='siteStatus'
                    className='font-medium'
                    sx={{
                      color: 'text.primary',
                      cursor: 'pointer'
                    }}
                  >
                    Site Durumu
                  </FormControl>
                  <Typography variant='body2'>
                    Güncelleme, yenileme, bakım çalışması vb. gibi sitenizi dışarıdan ziyaretçi girişine kapatmanız gereken durumlarda bu özelliği kullanarak sitenizi 'Yapım Aşamasında' moduna alabilirsiniz.
                  </Typography>
                </Grid>
                <Grid size={{ sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Site Durumu</InputLabel>
                    <Select
                      label='Site Durumu'
                      value={formData.siteStatus}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        siteStatus: e.target.value
                      }))}
                    >
                      <MenuItem value='0'>Yapım Aşamasında</MenuItem>
                      <MenuItem value='1'>Aktif</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <CardContent>
          <Grid container>
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
    </form>
  )
}

export default Connections