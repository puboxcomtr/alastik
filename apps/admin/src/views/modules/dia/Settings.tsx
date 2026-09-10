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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { toast } from 'react-toastify'
import type { DiaSettings, DiaConnectionStatus, DiaSettingsResponse, DiaTestConnectionPayload } from '@/types/apps/diaTypes'
import { defaultDiaSettings } from '@/types/apps/diaTypes'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import TransferSettingsCard from '@/views/modules/dia/TransferSettingsCard'
import { DiaKeySelect, DiaKeyMultiSelect } from '@/views/modules/dia/DiaKeyFields'
import type { DiaSiparisOptions } from '@/views/modules/dia/DiaKeyFields'

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
  const [siparisOptions, setSiparisOptions] = useState<DiaSiparisOptions | null>(null)
  const [siparisOptionsLoading, setSiparisOptionsLoading] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchSyncStats()
    fetchSiparisOptions()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await fetchAPI(API_ENDPOINTS.diaSettings.get())

      if (data.success && data.data) {
        setSettings(prev => ({
          ...prev,
          ...data.data,
          siparis: { ...prev.siparis, ...data.data.siparis },
          aktarim: { ...prev.aktarim, ...data.data.aktarim },
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
      const data = await fetchAPI(API_ENDPOINTS.diaSync.syncStats())
      if (data.success) setSyncStats(data.data)
    } catch {
    }
  }

  // Key alanları için DIA seçenek listeleri (şube/depo/kargo/plan/yetki kodları)
  const fetchSiparisOptions = async () => {
    try {
      setSiparisOptionsLoading(true)
      const data = await fetchAPI(API_ENDPOINTS.diaSettings.siparisOptions())
      if (data.success) setSiparisOptions(data.data)
    } catch {
      // Liste yüklenemezse alanlar elle girilebilir kalır
    } finally {
      setSiparisOptionsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const data = await fetchAPI(API_ENDPOINTS.diaSettings.update(), {
        method: 'PUT',
        body: JSON.stringify(settings)
      })

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
      const data = await fetchAPI(API_ENDPOINTS.diaSettings.testConnection(), {
        method: 'POST',
        body: JSON.stringify({
          baseURL: settings.baseURL,
          apiKey: settings.apiKey,
          username: settings.username,
          password: settings.password,
          firmaKodu: settings.firmaKodu,
          donemKodu: settings.donemKodu
        })
      })

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

      const data = await fetchAPI(API_ENDPOINTS.diaSync.fullSync(), {
        method: 'POST'
      })

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
          const statusData = await fetchAPI(API_ENDPOINTS.diaSync.jobProgress(jobId, 'full'))

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

      const data = await fetchAPI(API_ENDPOINTS.diaSync.lightSync(), {
        method: 'POST'
      })

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
          const statusData = await fetchAPI(API_ENDPOINTS.diaSync.jobProgress(jobId, 'light'))

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

  // Sipariş alanları metin, sayı ve anahtar (switch) değerleri taşıyor
  const updateSiparis = (field: string, value: string | number | boolean) => {
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
                    {/* Aktarımın kendisi ve hedef firma/dönem */}
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.siparis.aktif}
                            onChange={e => updateSiparis('aktif', e.target.checked)}
                          />
                        }
                        label="Siparişleri DİA'ya Aktar"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.siparis.faturaOtomatik}
                            onChange={e => updateSiparis('faturaOtomatik', e.target.checked)}
                          />
                        }
                        label="Faturayı Otomatik Kes"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.siparis.faturaSiparisiKapatsin}
                            onChange={e => updateSiparis('faturaSiparisiKapatsin', e.target.checked)}
                          />
                        }
                        label="Fatura Siparişi Kapatsın (Tamamı Sevk Edilmiş)"
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Sipariş Firma Kodu"
                        value={settings.siparis.firmaKodu}
                        onChange={e => updateSiparis('firmaKodu', Number(e.target.value))}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Sipariş Dönem Kodu"
                        value={settings.siparis.donemKodu}
                        onChange={e => updateSiparis('donemKodu', Number(e.target.value))}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Aktarım Zamanı</InputLabel>
                        <Select
                          label="Aktarım Zamanı"
                          value={settings.siparis.tetikleme}
                          onChange={e => updateSiparis('tetikleme', e.target.value)}
                        >
                          <MenuItem value="odemeAlininca">Ödeme alınınca</MenuItem>
                          <MenuItem value="siparisOlusunca">Sipariş oluşunca</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Şube"
                        value={settings.siparis.subeKey}
                        options={siparisOptions?.subeler}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('subeKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Depo (Sipariş)"
                        value={settings.siparis.depoKey}
                        options={siparisOptions?.depolar}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('depoKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Cari Modu</InputLabel>
                        <Select
                          label="Cari Modu"
                          value={settings.siparis.cariModu}
                          onChange={e => updateSiparis('cariModu', e.target.value)}
                        >
                          <MenuItem value="musteri">Her müşteri için ayrı cari</MenuItem>
                          <MenuItem value="tekCari">Tek genel cari</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {settings.siparis.cariModu === 'tekCari' && (
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          label="Genel Cari Kodu"
                          value={settings.siparis.genelCariKodu}
                          onChange={e => updateSiparis('genelCariKodu', e.target.value)}
                          size="small"
                        />
                      </Grid>
                    )}

                    <Grid size={{ xs: 6 }}>
                      <TextField
                        fullWidth
                        label="Cari Kod Öneki"
                        placeholder="örn: LJA-120.01."
                        value={settings.siparis.cariKodOnek}
                        onChange={e => updateSiparis('cariKodOnek', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Cari Özel Kod 1"
                        value={settings.siparis.cariOzelKod1Key}
                        options={siparisOptions?.cariOzelKodlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('cariOzelKod1Key', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Cari Yetki Kodu"
                        value={settings.siparis.cariSeviyeKodKey}
                        options={siparisOptions?.cariYetkiKodlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('cariSeviyeKodKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Satış Elemanı"
                        value={settings.siparis.satisElemaniKey}
                        options={siparisOptions?.satisElemanlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('satisElemaniKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Kargo Firması"
                        value={settings.siparis.kargoFirmaKey}
                        options={siparisOptions?.kargoFirmalari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('kargoFirmaKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Sipariş Yetki Kodu"
                        value={settings.siparis.siparisSeviyeKodKey}
                        options={siparisOptions?.siparisYetkiKodlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('siparisSeviyeKodKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Ödeme Planı — Tek Çekim"
                        value={settings.siparis.odemePlaniTekCekimKey}
                        options={siparisOptions?.odemePlanlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('odemePlaniTekCekimKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Ödeme Planı — Taksitli"
                        value={settings.siparis.odemePlaniTaksitliKey}
                        options={siparisOptions?.odemePlanlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('odemePlaniTaksitliKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Ödeme Planı — Havale"
                        value={settings.siparis.odemePlaniHavaleKey}
                        options={siparisOptions?.odemePlanlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('odemePlaniHavaleKey', key)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeyMultiSelect
                        label="Fatura Depoları (öncelik sırasıyla)"
                        value={settings.siparis.faturaDepoKeys}
                        options={siparisOptions?.depolar}
                        loading={siparisOptionsLoading}
                        onChange={keys => updateSiparis('faturaDepoKeys', keys)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <DiaKeySelect
                        label="Fatura Yetki Kodu"
                        value={settings.siparis.faturaSeviyeKodKey}
                        options={siparisOptions?.faturaYetkiKodlari}
                        loading={siparisOptionsLoading}
                        onChange={key => updateSiparis('faturaSeviyeKodKey', key)}
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

                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>

                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Durum Filtresi (DİA)"
                        value={settings.sync.durumFiltre}
                        onChange={e => updateSync('durumFiltre', e.target.value)}
                        size="small"
                        placeholder="A"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="Özel Kod 11 Filtresi"
                        value={settings.sync.ozelkod11Filtre}
                        onChange={e => updateSync('ozelkod11Filtre', e.target.value)}
                        size="small"
                        placeholder="E"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="B2C Göster Filtresi"
                        value={settings.sync.b2cFiltre}
                        onChange={e => updateSync('b2cFiltre', e.target.value)}
                        size="small"
                        placeholder="Boş = kapalı"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        fullWidth
                        label="B2B Göster Filtresi"
                        value={settings.sync.b2bFiltre || ''}
                        onChange={e => updateSync('b2bFiltre', e.target.value)}
                        size="small"
                        placeholder="Boş = kapalı"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.sync.hashKontrol}
                            onChange={e => updateSync('hashKontrol', e.target.checked)}
                          />
                        }
                        label="Hash Kontrolü (değişmeyen ürünleri senkronda atla)"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            {/* Aktarım Ayarları */}
            <Grid size={{ xs: 12 }}>
              <TransferSettingsCard
                value={settings.aktarim}
                onChange={aktarim => setSettings(prev => ({ ...prev, aktarim }))}
              />
            </Grid>

            {/* Her Zaman Dahil — kural filtrelerini ve Hariç listesini atlayan istisna listesi */}
            <Grid size={{ xs: 12 }}>
              <TransferSettingsCard
                hideMode
                title="Her Zaman Dahil"
                selectionHint="Burada seçilenler durum dışındaki kurallara ve Hariç Bırak listesine takılmadan siteye aktarılır"
                value={settings.zorunluDahil}
                onChange={zorunluDahil => setSettings(prev => ({ ...prev, zorunluDahil }))}
              />
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