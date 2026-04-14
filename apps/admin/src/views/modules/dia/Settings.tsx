'use client'

import React, { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { toast } from 'react-toastify'
import type { DiaSettings, DiaConnectionStatus, DiaSettingsResponse, DiaTestConnectionPayload } from '@/types/apps/diaTypes'
import { defaultDiaSettings } from '@/types/apps/diaTypes'
import { API_ENDPOINTS } from '@libs/api'


export default function Settings() {
  const [settings, setSettings] = useState<DiaSettings>(defaultDiaSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<DiaConnectionStatus>('idle')
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ percent: number, message: string, step: number, totalSteps: number } | null>(null)
  const [lightSyncing, setLightSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState<{
    syncedProducts: number, totalDiaProducts: number, unsyncedProducts: number,
    syncedCategories: number, syncedBrands: number, lastSyncDate: string | null
  } | null>(null)

  useEffect(() => {
    fetchSettings()
    fetchSyncStats()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(API_ENDPOINTS.diaSettings.get())
      const data = await res.json()

      if (data.success && data.data) {
        setSettings(prev => ({
          ...prev,
          ...data.data,
          siparis: { ...prev.siparis, ...data.data.siparis },
          sync: { ...prev.sync, ...data.data.sync }
        }))
      }
    } catch {
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }
  const fetchSyncStats = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.diaSync.syncStats())
      const data = await res.json()
      if (data.success) setSyncStats(data.data)
    } catch {
    }
  }
  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch(API_ENDPOINTS.diaSettings.update(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Ayarlar başarıyla kaydedildi')
      } else {
        toast.error(data.message || 'Kaydetme hatası')
      }
    } catch {
      toast.error('Ayarlar kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }


  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setConnectionStatus('idle')
      const res = await fetch(API_ENDPOINTS.diaSettings.testConnection(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: settings.baseURL,
          apiKey: settings.apiKey,
          username: settings.username,
          password: settings.password,
          firmaKodu: settings.firmaKodu,
          donemKodu: settings.donemKodu
        })
      })
      const data = await res.json()

      if (data.success) {
        setConnectionStatus('success')
        toast.success('Bağlantı başarılı')
      } else {
        setConnectionStatus('error')
        toast.error(data.message || 'Bağlantı hatası')
      }
    } catch {
      setConnectionStatus('error')
      toast.error('Bağlantı test edilemedi')
    } finally {
      setTesting(false)
    }
  }

  const handleFullSync = async () => {
    try {
      setSyncing(true)
      setSyncProgress({ percent: 0, message: 'Başlatılıyor...', step: 0, totalSteps: 9 })

      const res = await fetch(API_ENDPOINTS.diaSync.fullSync(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()

      if (!data.success) {
        toast.error(data.message || 'Senkronizasyon başlatılamadı')
        setSyncing(false)
        setSyncProgress(null)
        return
      }

      const jobId = data.data?.jobId
      if (!jobId) {
        toast.warning('Senkronizasyon başlatıldı ancak takip edilemiyor')
        setSyncing(false)
        setSyncProgress(null)
        return
      }

      toast.info('Senkronizasyon başlatıldı...')

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(API_ENDPOINTS.diaSync.jobProgress(jobId, 'full'))
          const statusData = await statusRes.json()

          if (!statusData.success) return

          const { state, progress, result, failedReason } = statusData.data

          if (progress && typeof progress === 'object') {
            setSyncProgress({
              percent: progress.percent || 0,
              message: progress.message || 'İşleniyor...',
              step: progress.step || 0,
              totalSteps: progress.totalSteps || 5
            })
          }

          if (state === 'completed') {
            clearInterval(pollInterval)
            setSyncing(false)
            setSyncProgress(null)
            fetchSyncStats()
            const urun = (result?.diaStock?.processed || 0) + (result?.webProduct?.processed || 0);
            const kategori = (result?.categories?.created || 0) + (result?.categories?.updated || 0);
            const marka = (result?.brands?.created || 0) + (result?.brands?.updated || 0);
            const sure = result?.duration ? `${Math.round(result.duration / 1000)}sn` : '';
            toast.success(
              `Senkronizasyon tamamlandı. ${urun} ürün, ${kategori} kategori, ${marka} marka işlendi. ${sure}`
            )
          } else if (state === 'failed') {
            clearInterval(pollInterval)
            setSyncing(false)
            setSyncProgress(null)
            toast.error(`Senkronizasyon başarısız: ${failedReason || 'Bilinmeyen hata'}`)
          }
        } catch {
          // Polling hatası sessizce geç
        }
      }, 2000)
    } catch {
      toast.error('Senkronizasyon başlatılamadı')
      setSyncing(false)
      setSyncProgress(null)
    }
  }
  const handleLightSync = async () => {
    try {
      setLightSyncing(true)

      const res = await fetch(API_ENDPOINTS.diaSync.lightSync(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()

      if (!data.success) {
        toast.error(data.message || 'Güncelleme başlatılamadı')
        setLightSyncing(false)
        return
      }

      const jobId = data.data?.jobId
      if (!jobId) {
        toast.warning('Güncelleme başlatıldı ancak takip edilemiyor')
        setLightSyncing(false)
        return
      }

      toast.info('Fiyat ve stok güncelleniyor...')

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(API_ENDPOINTS.diaSync.jobProgress(jobId, 'light'))
          const statusData = await statusRes.json()

          if (!statusData.success) return

          const { state, result, failedReason } = statusData.data

          if (state === 'completed') {
            clearInterval(pollInterval)
            setLightSyncing(false)
            const priceUpdated = result?.priceResult?.updated || 0
            const priceSkipped = result?.priceResult?.skipped || 0
            const stockUpdated = result?.stockResult?.updated || 0
            const stockSkipped = result?.stockResult?.skipped || 0
            toast.success(`Fiyat: ${priceUpdated} güncellendi, ${priceSkipped} değişmedi. | Stok: ${stockUpdated} güncellendi, ${stockSkipped} değişmemiş`)
            fetchSyncStats()
          } else if (state === 'failed') {
            clearInterval(pollInterval)
            setLightSyncing(false)
            toast.error(`Güncelleme başarısız: ${failedReason || 'Bilinmeyen hata'}`)
          }
        } catch {
          // Polling hatası sessizce geç
        }
      }, 3000)
    } catch {
      toast.error('Fiyat/Stok güncellenemedi')
      setLightSyncing(false)
    }
  }
  const updateField = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const updateSiparis = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      siparis: { ...prev.siparis, [field]: value }
    }))
  }

  const updateSync = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      sync: { ...prev.sync, [field]: value }
    }))
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={8} justifyContent="center">
      <Grid size={{ xs: 10 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 8 }} container spacing={3}>
            {/* Bağlantı Ayarları */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader
                  title="DİA Bağlantı Ayarları"
                  subheader="DİA ERP sistemi bağlantı bilgileri"
                  action={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleTestConnection}
                        disabled={testing}
                        startIcon={testing ? <CircularProgress size={16} /> : null}
                      >
                        {testing ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                      </Button>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Sunucu Adresi"
                        value={settings.baseURL}
                        onChange={e => updateField('baseURL', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Kullanıcı Adı"
                        value={settings.username}
                        onChange={e => updateField('username', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Şifre"
                        type={showPassword ? 'text' : 'password'}
                        value={settings.password}
                        onChange={e => updateField('password', e.target.value)}
                        size="small"
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                >
                                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                </IconButton>
                              </InputAdornment>
                            )
                          }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="API Key"
                        value={settings.apiKey}
                        onChange={e => updateField('apiKey', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Firma Kodu"
                        type="number"
                        value={settings.firmaKodu}
                        onChange={e => updateField('firmaKodu', parseInt(e.target.value) || 1)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Dönem Kodu"
                        type="number"
                        value={settings.donemKodu}
                        onChange={e => updateField('donemKodu', parseInt(e.target.value) || 1)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            {/* Sipariş Entegrasyonu */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader
                  title="Sipariş Entegrasyonu"
                  subheader="DİA sipariş, fatura ve cari hesap ayarları"
                />
                <CardContent>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Şube Kodu"
                        value={settings.siparis.subeKodu}
                        onChange={e => updateSiparis('subeKodu', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Depo Kodu"
                        value={settings.siparis.depoKodu}
                        onChange={e => updateSiparis('depoKodu', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Cari Grubu"
                        value={settings.siparis.cariGrubu}
                        onChange={e => updateSiparis('cariGrubu', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Seviye Kodu"
                        value={settings.siparis.seviyeKoduSiparis}
                        onChange={e => updateSiparis('seviyeKoduSiparis', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Seviye Kodu"
                        value={settings.siparis.seviyeKoduCari}
                        onChange={e => updateSiparis('seviyeKoduCari', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Divider sx={{ my: 3, width: '100%' }} />
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Stopaj Ödeme Türü"
                        placeholder="örn: 011"
                        value={settings.siparis.stopajOdemeTuru}
                        onChange={e => updateSiparis('stopajOdemeTuru', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Fatura Türü"
                        placeholder="örn: 2"
                        value={settings.siparis.faturaTuru}
                        onChange={e => updateSiparis('faturaTuru', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Ödeme Planı Kodu"
                        value={settings.siparis.odemePlaniKodu}
                        onChange={e => updateSiparis('odemePlaniKodu', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Özel Kod 1 (Cari)"
                        value={settings.siparis.ozelKod1Cari}
                        onChange={e => updateSiparis('ozelKod1Cari', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Masraf Merkezi Kodu"
                        value={settings.siparis.masrafMerkeziKodu}
                        onChange={e => updateSiparis('masrafMerkeziKodu', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Proje Kodu"
                        value={settings.siparis.projeKodu}
                        onChange={e => updateSiparis('projeKodu', e.target.value)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            {/* Senkronizasyon Ayarları */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader
                  title="Senkronizasyon Ayarları"
                  subheader="Ürün ve stok senkronizasyon tercihleri"
                />
                <CardContent>
                  <Grid container spacing={5}>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.sync.urunAdlariniGuncelle}
                            onChange={e => updateSync('urunAdlariniGuncelle', e.target.checked)}
                          />
                        }
                        label="Ürün Adlarını Güncelle"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.sync.fiyatGuncellemeKapat}
                            onChange={e => updateSync('fiyatGuncellemeKapat', e.target.checked)}
                          />
                        }
                        label="Fiyat Güncellemeyi Kapat"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.sync.urunAciklamalari}
                            onChange={e => updateSync('urunAciklamalari', e.target.checked)}
                          />
                        }
                        label="Ürün Açıklamaları"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.sync.kategoriGuncellemeKapat}
                            onChange={e => updateSync('kategoriGuncellemeKapat', e.target.checked)}
                          />
                        }
                        label="Kategori Güncellemesini Kapat"
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Tam Senkronizasyon Saati"
                        value={settings.sync.fullSyncSaat}
                        onChange={e => updateSync('fullSyncSaat', e.target.value)}
                        size="small"
                        placeholder="05:00"
                        helperText="Her gun bu saatte tam senkronizasyon calısır (ornek: 05:00)"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Fiyat/Stok Güncelleme Aralığı (dk)"
                        type="number"
                        value={settings.sync.lightSyncAraligi}
                        onChange={e => updateSync('lightSyncAraligi', parseInt(e.target.value) || 15)}
                        size="small"
                        helperText="Dakika bazında (varsayılan: 15)"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          {/* Sağ Kolon */}
          <Grid size={{ xs: 4 }} container spacing={5}>
            <Grid size={{ xs: 12 }}>
              <Card className='mb-5'>
                <CardHeader title="Bağlantı Durumu" />
                <CardContent>
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Durum</Typography>
                      {connectionStatus === 'success' ? (
                        <Chip label="Bağlı" color="success" size="small" />
                      ) : connectionStatus === 'error' ? (
                        <Chip label="Bağlantı Hatası" color="error" size="small" />
                      ) : (
                        <Chip label="Test Edilmedi" color="default" size="small" />
                      )}
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Sunucu</Typography>
                      <Typography variant="body2">
                        {settings.baseURL ? new URL(settings.baseURL).hostname : '-'}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Firma Kodu</Typography>
                      <Typography variant="body2">{settings.firmaKodu}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Dönem Kodu</Typography>
                      <Typography variant="body2">{settings.donemKodu}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              {syncStats && (
                <Card className='mb-5'>
                  <CardHeader title="Senkronizasyon Durumu" />
                  <CardContent>
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Senkronize Ürünler</Typography>
                        <Typography variant="body2" fontWeight="bold">{syncStats.syncedProducts.toLocaleString('tr-TR')}</Typography>
                      </Box>
                      <Divider />
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">DIA Toplam Ürün</Typography>
                        <Typography variant="body2" fontWeight="bold">{syncStats.totalDiaProducts.toLocaleString('tr-TR')}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Senkronize Olmayan</Typography>
                        <Typography variant="body2" fontWeight="bold">{syncStats.unsyncedProducts.toLocaleString('tr-TR')}</Typography>
                      </Box>
                      <Divider />
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Kategoriler</Typography>
                        <Typography variant="body2">{syncStats.syncedCategories}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Markalar</Typography>
                        <Typography variant="body2">{syncStats.syncedBrands}</Typography>
                      </Box>
                      <Divider />
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Son Senkronizasyon</Typography>
                        <Typography variant="body2">
                          {syncStats.lastSyncDate
                            ? new Date(syncStats.lastSyncDate).toLocaleString('tr-TR')
                            : '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
              {syncProgress && (
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {syncProgress.message}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      %{syncProgress.percent}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${syncProgress.percent}%`,
                        bgcolor: 'primary.main',
                        height: '100%',
                        borderRadius: 1,
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Adım {syncProgress.step}/{syncProgress.totalSteps}
                  </Typography>
                </Box>
              )}
              <Button
                fullWidth
                variant="outlined"
                onClick={handleFullSync}
                disabled={syncing}
                startIcon={syncing ? <CircularProgress size={16} /> : null}
              >
                {syncing ? 'Senkronize Ediliyor...' : 'Tümünü Senkronize Et'}
              </Button>
              <Button
                fullWidth
                className='mt-3'
                variant="outlined"
                color="secondary"
                onClick={handleLightSync}
                disabled={syncing || lightSyncing}
                startIcon={lightSyncing ? <CircularProgress size={16} /> : null}
              >
                {lightSyncing ? 'Güncelleniyor...' : 'Fiyat ve Stok Güncelle'}
              </Button>
              <Divider sx={{ my: 3, width: '100%' }} />
              <Card>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </Button>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}