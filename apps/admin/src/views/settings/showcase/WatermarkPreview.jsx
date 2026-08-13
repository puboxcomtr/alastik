'use client'

import { useEffect, useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Panel seçenekleri -> önizleme kutusundaki yerleşim
const KONUM_STILLERI = {
  'sol-ust': { top: 0, left: 0 },
  'sag-ust': { top: 0, right: 0 },
  'sol-alt': { bottom: 0, left: 0 },
  'sag-alt': { bottom: 0, right: 0 },
  orta: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
}

const KUTU_BOYUTU = 380

const WatermarkPreview = ({ formData }) => {
  const [sampleImage, setSampleImage] = useState('')
  const [sampleName, setSampleName] = useState('')
  const [loading, setLoading] = useState(true)
  const [logoRatio, setLogoRatio] = useState(null)

  // Örnek ürün görseli: görseli olan ilk üründen alınır (sabit adres kullanılmaz).
  // Panel alan adı /urun/ görsellerini filigransız sunar; önizleme çift basmaz.
  useEffect(() => {
    const loadSample = async () => {
      try {
        const response = await fetchAPI(`${API_ENDPOINTS.products.list()}?has_image=yes&limit=10`)

        // Yer tutucu görselli kayıtlar elenir; gerçek ürün fotoğrafı seçilir
        const urun = (response?.data || []).find(
          (kayit) => kayit?.image && !kayit.image.includes('gorsel-bulunamadi')
        )

        if (urun) {
          setSampleImage(urun.image)
          setSampleName(urun.name || '')
        }
      } catch {
        // Örnek görsel alınamazsa önizleme boş bırakılır
      } finally {
        setLoading(false)
      }
    }

    loadSample()
  }, [])

  const logoUrl = formData.watermarkImagePreview

  if (loading) {
    return (
      <div className='flex justify-center p-6'>
        <CircularProgress size={28} />
      </div>
    )
  }

  if (!logoUrl) {
    return (
      <Typography variant='body2' color='text.secondary'>
        Önizleme için bir filigran görseli seçin.
      </Typography>
    )
  }

  if (!sampleImage) {
    return (
      <Typography variant='body2' color='text.secondary'>
        Önizleme için katalogdan görselli bir ürün bulunamadı.
      </Typography>
    )
  }

  // Sunucudaki ölçek hesabının aynısı: döndürülen filigranın kapladığı kutu,
  // logonun en-boy oranına bağlıdır ve ürün görselini aşamaz.
  const aci = Number(formData.watermarkRotation) || 0
  const radyan = (Math.abs(aci) * Math.PI) / 180
  const kosinus = Math.abs(Math.cos(radyan))
  const sinus = Math.abs(Math.sin(radyan))
  const oran = logoRatio || 1

  const hedefKutuGenislik = KUTU_BOYUTU * (Number(formData.watermarkWidth) / 100)
  const genislikIcin = hedefKutuGenislik / (kosinus + oran * sinus)
  const yukseklikIcin = KUTU_BOYUTU / (sinus + oran * kosinus)
  const logoGenislik = Math.min(genislikIcin, yukseklikIcin)

  // Döndürülmüş halin kapladığı alan: sarmalayıcı bu ölçüde konumlandırılır
  const kutuGenislik = logoGenislik * (kosinus + oran * sinus)
  const kutuYukseklik = logoGenislik * (sinus + oran * kosinus)

  const konum = KONUM_STILLERI[formData.watermarkPosition] || KONUM_STILLERI['sol-ust']

  return (
    <div className='flex flex-col gap-3'>
      <Card variant='outlined' sx={{ width: 'fit-content' }}>
        <CardContent className='flex flex-col items-center gap-2'>
          <div
            style={{
              position: 'relative',
              width: KUTU_BOYUTU,
              height: KUTU_BOYUTU,
              overflow: 'hidden',
              backgroundColor: '#fff'
            }}
          >
            <img
              src={sampleImage}
              alt='Örnek ürün görseli'
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />

            <div
              style={{
                position: 'absolute',
                width: kutuGenislik,
                height: kutuYukseklik,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                ...konum
              }}
            >
              <img
                src={logoUrl}
                alt='Filigran'
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget

                  if (naturalWidth > 0) setLogoRatio(naturalHeight / naturalWidth)
                }}
                style={{
                  width: logoGenislik,
                  opacity: Number(formData.watermarkOpacity) / 100,
                  transform: `rotate(${aci}deg)`,
                  maxWidth: 'none'
                }}
              />
            </div>
          </div>

          <Typography variant='caption' color='text.secondary' className='text-center'>
            {sampleName ? `Katalogdan örnek: ${sampleName}` : 'Katalogdan örnek ürün görseli'}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant='caption' color='text.secondary'>
        Konum, yön, genişlik ve opaklık değiştikçe önizleme anında güncellenir. Kaydettiğinizde
        üretilmiş filigranlı kopyalar silinir ve görseller yeni ayarla yeniden üretilir.
      </Typography>
    </div>
  )
}

export default WatermarkPreview
