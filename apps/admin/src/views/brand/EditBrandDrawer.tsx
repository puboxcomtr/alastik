'use client'

// React Imports
import { useEffect, useState, useRef } from 'react'
import type { ChangeEvent } from 'react'

// Type import
import type { BrandType } from '@/types/apps/brandTypes'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'

// Toast import
import { toast } from 'react-toastify'


type Props = {
  brandData: BrandType[]
  selectedbrand: BrandType | null
  setData: (data: BrandType[]) => void
}

const EditBrandDrawer = ({ open, handleClose, brandData, selectedbrand, setData }: Props) => {
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    description: '',
    seoTitle: '',
    seoDescription: '',
    seoUrl: '',
    webOrder: 0
  })

  useEffect(() => {
    if (selectedbrand) {
      setFormData({
        description: selectedbrand.description || '',
        seoTitle: selectedbrand.seoTitle || selectedbrand.name || '',
        seoDescription: selectedbrand.seoDescription || `${selectedbrand.name} markası ürünleri`,
        seoUrl: selectedbrand.seoUrl || selectedbrand.name.toLowerCase().replace(/\s+/g, '-'),
        webOrder: selectedbrand.webOrder || 0
      })
      if (selectedbrand.logo) {
        const imgParts = selectedbrand.logo.split('/')
        setFileName(imgParts[imgParts.length - 1] || '')
      } else {
        setFileName('')
      }
    } else {
      setFormData({
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoUrl: '',
        webOrder: 0
      })
      setFileName('')
    }
  }, [selectedbrand])

  const onSubmit = async () => {
    if (!selectedbrand || isLoading) return

    setIsLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
      const response = await fetch(`${baseUrl}/brands/${selectedbrand.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          seoTitle: formData.seoTitle,
          seoDescription: formData.seoDescription,
          seoUrl: formData.seoUrl,
          webOrder: formData.webOrder
        })
      })

      const result = await response.json()
      if (result.success && result.data) {
        const updatedBrandData = brandData.map(brand => {
          if (brand.id === selectedbrand.id) {
            return {
              ...brand,
              description: formData.description,
              seoTitle: formData.seoTitle,
              seoDescription: formData.seoDescription,
              seoUrl: formData.seoUrl,
              webOrder: formData.webOrder
            }
          }
          return brand
        })

        setData(updatedBrandData)

        toast.success(`${selectedbrand.name} markası başarıyla güncellendi!`, {
          position: 'top-right',
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: {
            zIndex: 9999,
          }
        })

        handleClose()

      } else {
        toast.error(`Güncelleme Hatası: ${result.message || 'Marka güncellenirken hata oluştu'}`, {
          position: 'top-right',
          autoClose: 4000,
          style: { zIndex: 9999 }
        })
      }
    } catch (error) {
      console.error('API hatası:', error)
      toast.error('Bağlantı Hatası: Sunucuya ulaşılamıyor. Lütfen tekrar deneyin.', {
        position: 'top-right',
        autoClose: 4000,
        style: { zIndex: 9999 }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (files && files.length > 0) {
      setFileName(files[0].name)
    }
  }

  const handleDiscard = () => {
    handleClose()
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleDiscard}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: 300, sm: 400 },
          zIndex: 1200
        }
      }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>Marka Düzenle</Typography>
        <IconButton size='small' onClick={handleDiscard}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <div className='p-5'>
        <form onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }} className='flex flex-col gap-5'>
          <TextField
            fullWidth
            label='Marka Adı'
            value={selectedbrand?.name || ''}
            InputProps={{
              readOnly: true,
            }}
          />


          <TextField
            fullWidth
            multiline
            minRows={3}
            label='Marka Açıklama'
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder='Marka açıklaması giriniz'
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label='SEO Başlık'
            value={formData.seoTitle}
            onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
            placeholder='SEO başlık giriniz'
            disabled={isLoading}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label='SEO Açıklama'
            value={formData.seoDescription}
            onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
            placeholder='SEO açıklama giriniz'
            disabled={isLoading}
          />

          <TextField
            fullWidth
            label='SEO URL'
            value={formData.seoUrl}
            onChange={(e) => setFormData({ ...formData, seoUrl: e.target.value })}
            placeholder='SEO URL giriniz'
            disabled={isLoading}
          />

          <TextField
            fullWidth
            type='number'
            label='Öncelik'
            value={formData.webOrder}
            onChange={(e) => setFormData({ ...formData, webOrder: Number(e.target.value) })}
            placeholder='Marka sıralamasını belirleyiniz'
            disabled={isLoading}
          />

          <TextField
            size='small'
            placeholder='No file chosen'
            variant='outlined'
            value={fileName}
            className='flex-auto'
            InputProps={{
              readOnly: true,
              endAdornment: fileName ? (
                <InputAdornment position='end'>
                  <IconButton size='small' edge='end' onClick={() => setFileName('')}>
                    <i className='ri-close-line' />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          <Button
            component='label'
            variant='outlined'
            htmlFor='contained-button-file'
            className='min-is-fit'
            disabled={isLoading}
          >
            Dosya Seçiniz
            <input hidden id='contained-button-file' type='file' onChange={handleFileUpload} ref={fileInputRef} />
          </Button>

          <div className='flex items-center gap-4'>
            <Button
              variant='contained'
              type='submit'
              disabled={isLoading}
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
            <Button
              variant='outlined'
              color='error'
              onClick={handleDiscard}
              disabled={isLoading}
            >
              Vazgeç
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default EditBrandDrawer