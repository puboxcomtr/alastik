'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

// SeoSettings.analysis ile birebir; boş gelirse motorun varsayılanları
const DEFAULTS = {
  titleMin: 30,
  titleMax: 60,
  descriptionMin: 70,
  descriptionMax: 160,
  densityMin: 0.5,
  densityMax: 2.5,
  minWords: { blog: 600, page: 300, product: 150, category: 100, brand: 100, tag: 100 },
  minInternalLinks: { blog: 2, page: 2, product: 1, category: 1, brand: 1, tag: 1 },
  goodScore: 80,
  fairScore: 50
}

const TYPE_LABELS = { blog: 'Blog', page: 'Sayfa', product: 'Ürün', category: 'Kategori', brand: 'Marka', tag: 'Etiket' }

const NumberField = ({ label, value, onChange, helper, step = 1 }) => (
  <TextField
    fullWidth
    type='number'
    label={label}
    value={value ?? ''}
    onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    inputProps={{ step, min: 0 }}
    helperText={helper}
  />
)

// İçerik analizi kriter eşikleri (SEO > Ayarlar > Analiz Kriterleri)
const Analysis = ({ formData, setFormData, handleSave, saving }) => {
  const analysis = {
    ...DEFAULTS,
    ...(formData.analysis || {}),
    minWords: { ...DEFAULTS.minWords, ...(formData.analysis?.minWords || {}) },
    minInternalLinks: { ...DEFAULTS.minInternalLinks, ...(formData.analysis?.minInternalLinks || {}) }
  }

  const set = (key, value) => setFormData(prev => ({ ...prev, analysis: { ...(prev.analysis || {}), [key]: value } }))
  const setMinWords = (type, value) => setFormData(prev => ({
    ...prev,
    analysis: { ...(prev.analysis || {}), minWords: { ...(prev.analysis?.minWords || {}), [type]: value } }
  }))
  const setMinLinks = (type, value) => setFormData(prev => ({
    ...prev,
    analysis: { ...(prev.analysis || {}), minInternalLinks: { ...(prev.analysis?.minInternalLinks || {}), [type]: value } }
  }))

  return (
    <Card>
      <Grid container justifyContent='center'>
        <Grid size={{ xs: 12, md: 10 }}>
          <CardHeader
            title='İçerik Analizi Kriterleri'
            subheader='İçerik puanı bu eşiklere göre hesaplanır. Değişiklik bir sonraki taramada (her gece 03:30) veya "Taramayı başlat" ile tüm içeriklere uygulanır.'
          />
          <Divider />
          <CardContent>
            <Grid container spacing={6}>
              <Grid size={{ xs: 12 }}>
                <Typography variant='h6'>Başlık ve açıklama</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='Başlık en az (karakter)' value={analysis.titleMin} onChange={v => set('titleMin', v)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='Başlık en çok (karakter)' value={analysis.titleMax} onChange={v => set('titleMax', v)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='Meta açıklama en az' value={analysis.descriptionMin} onChange={v => set('descriptionMin', v)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='Meta açıklama en çok' value={analysis.descriptionMax} onChange={v => set('descriptionMax', v)} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant='h6'>Anahtar kelime yoğunluğu (%)</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='En az' value={analysis.densityMin} onChange={v => set('densityMin', v)} step={0.1} helper='Odak kelimenin metindeki payı' />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='En çok' value={analysis.densityMax} onChange={v => set('densityMax', v)} step={0.1} helper='Üstü anahtar kelime doldurma sayılır' />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant='h6'>En az kelime sayısı</Typography>
              </Grid>
              {Object.keys(TYPE_LABELS).map(type => (
                <Grid key={type} size={{ xs: 12, sm: 6, md: 2 }}>
                  <NumberField label={TYPE_LABELS[type]} value={analysis.minWords[type]} onChange={v => setMinWords(type, v)} />
                </Grid>
              ))}

              <Grid size={{ xs: 12 }}>
                <Typography variant='h6'>Link inşası: en az iç link sayısı</Typography>
              </Grid>
              {Object.keys(TYPE_LABELS).map(type => (
                <Grid key={`links-${type}`} size={{ xs: 12, sm: 6, md: 2 }}>
                  <NumberField label={TYPE_LABELS[type]} value={analysis.minInternalLinks[type]} onChange={v => setMinLinks(type, v)} />
                </Grid>
              ))}

              <Grid size={{ xs: 12 }}>
                <Typography variant='h6'>Durum eşikleri (puan)</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='İyi (bu puan ve üstü)' value={analysis.goodScore} onChange={v => set('goodScore', v)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumberField label='Eksik (bu puan ve üstü)' value={analysis.fairScore} onChange={v => set('fairScore', v)} helper='Altı "Zayıf" sayılır' />
              </Grid>

              <Grid size={{ xs: 12 }} className='flex justify-end'>
                <Button variant='contained' onClick={handleSave} disabled={saving}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Grid>
      </Grid>
    </Card>
  )
}

export default Analysis
