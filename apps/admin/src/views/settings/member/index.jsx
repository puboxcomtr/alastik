'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormLabel from '@mui/material/FormLabel'
import Typography from '@mui/material/Typography'
import { FormControl, Switch } from '@mui/material'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'
import { getSettings, updateSettings } from '@/utils/api/settings'

const Member = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    newMember: false,
    controlMember: false,
    memberActivation: 'close'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await getSettings('member')

      if (response.success) {
        setFormData({
          newMember: response.data.newMember || false,
          controlMember: response.data.controlMember || false,
          memberActivation: response.data.memberActivation || 'close'
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
        newMember: formData.newMember,
        controlMember: formData.controlMember,
        memberActivation: formData.memberActivation
      }

      await updateSettings('member', dataToSave)

      toast.success('Üyelik ayarları kaydedildi')
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
            <CardHeader title="Üyelik Yönetimi" />
            <CardContent>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl component='fieldset'>
                    <div className="flex items-start gap-3">
                      <Switch
                        id="newMember"
                        checked={formData.newMember}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          newMember: e.target.checked
                        }))}
                      />
                      <div>
                        <FormLabel
                          component='label'
                          htmlFor='newMember'
                          className='text-base font-medium mb-1 cursor-pointer'
                        >
                          Yeni Üyelik
                        </FormLabel>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          Ziyaretçilerinizin sitenize üye olabilmeleri için bu özelliği açabilirsiniz.
                        </Typography>
                      </div>
                    </div>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl component='fieldset'>
                    <div className="flex items-start gap-3">
                      <Switch
                        id="controlMember"
                        checked={formData.controlMember}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          controlMember: e.target.checked
                        }))}
                      />
                      <div>
                        <FormLabel
                          component='label'
                          htmlFor='controlMember'
                          className='text-base font-medium mb-1 cursor-pointer'
                        >
                          Zorunlu Üyelik Sistemi
                        </FormLabel>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          Aktif edildiğinde, sitenizi sadece üye olanlar üye girişi yaparak gezebilir.
                        </Typography>
                      </div>
                    </div>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Üye Aktivasyon Sistemi</InputLabel>
                    <Select
                      label='Üye Aktivasyon Sistemi'
                      value={formData.memberActivation}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        memberActivation: e.target.value
                      }))}
                    >
                      <MenuItem value='close'>Kapalı</MenuItem>
                      <MenuItem value='personal'>Bireysel Aktivasyon</MenuItem>
                      <MenuItem value='admin'>Yönetici Aktivasyon</MenuItem>
                    </Select>
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

export default Member