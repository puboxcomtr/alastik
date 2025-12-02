'use client'

import { useEffect, useState } from 'react'
import type { CategoryType } from '@/types/apps/productTypes'

import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import { toast } from 'react-toastify'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

type SliderOption = {
  _id: string
  name: string
  key?: string
}

type Props = {
  open: boolean
  handleClose: () => void
  categoryData: CategoryType[]
  selectedCategory: CategoryType | null
  setData: (data: CategoryType[]) => void
}

const EditCategoryDrawer = ({ open, handleClose, categoryData, selectedCategory, setData }: Props) => {
  const [sliders, setSliders] = useState<SliderOption[]>([])
  const [loadingSliders, setLoadingSliders] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    description: '',
    seoTitle: '',
    seoDescription: '',
    seoUrl: '',
    webOrder: 0,
    sliderId: ''
  })

  // Slider listesini yükle
  const fetchSliders = async () => {
    try {
      setLoadingSliders(true)
      const response = await fetch(`${API_URL}/categories/sliders/list`, {
        credentials: 'include'
      })
      const result = await response.json()
      if (result.success && result.data) {
        setSliders(result.data)
      }
    } catch (error) {
      console.error('Slider listesi yüklenemedi:', error)
    } finally {
      setLoadingSliders(false)
    }
  }

  // Drawer açıldığında slider listesini yükle ve form data'yı set et
  useEffect(() => {
    if (open) {
      fetchSliders()
    }
  }, [open])

  // selectedCategory değiştiğinde form data'yı güncelle
  useEffect(() => {
    if (selectedCategory && open) {
      setFormData({
        description: selectedCategory.description || '',
        seoTitle: selectedCategory.seoTitle || '',
        seoDescription: selectedCategory.seoDescription || '',
        seoUrl: selectedCategory.seoUrl || '',
        webOrder: selectedCategory.webOrder || 0,
        sliderId: (selectedCategory as any).sliderId ? String((selectedCategory as any).sliderId) : ''
      })
    }
  }, [selectedCategory, open])

  // Drawer kapandığında formu sıfırla
  useEffect(() => {
    if (!open) {
      setFormData({
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoUrl: '',
        webOrder: 0,
        sliderId: ''
      })
    }
  }, [open])

  const onSubmit = async () => {
    if (!selectedCategory || isLoading) return

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          description: formData.description,
          seoTitle: formData.seoTitle,
          seoDescription: formData.seoDescription,
          seoUrl: formData.seoUrl,
          webOrder: formData.webOrder,
          sliderId: formData.sliderId || null
        })
      })

      const result = await response.json()
      if (result.success && result.data) {
        const updatedCategoryData = categoryData.map(cat => {
          if (cat.id === selectedCategory.id) {
            return {
              ...cat,
              description: result.data.description,
              seoTitle: result.data.seoTitle,
              seoDescription: result.data.seoDescription,
              seoUrl: result.data.seoUrl,
              webOrder: result.data.webOrder,
              sliderId: result.data.sliderId,
              updatedAt: result.data.updatedAt
            }
          }
          return cat
        })

        setData(updatedCategoryData)

        toast.success(`${selectedCategory.name} kategorisi başarıyla güncellendi!`)
        handleClose()

      } else {
        toast.error(`Güncelleme Hatası: ${result.message || 'Kategori güncellenirken hata oluştu'}`)
      }
    } catch (error) {
      console.error('API hatası:', error)
      toast.error('Bağlantı Hatası: Sunucuya ulaşılamıyor. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
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
        <Typography variant='h5'>Kategori Düzenle</Typography>
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
            label='Kategori Adı'
            value={selectedCategory?.name || ''}
            InputProps={{
              readOnly: true,
            }}
          />

          <TextField
            fullWidth
            multiline
            minRows={3}
            label='Kategori Açıklama'
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder='Kategori açıklaması giriniz'
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
            minRows={3}
            label='SEO Açıklama'
            value={formData.seoDescription}
            onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
            placeholder='SEO açıklaması giriniz (Meta Description)'
            disabled={isLoading}
            inputProps={{ maxLength: 160 }}
            helperText={`${formData.seoDescription.length}/160 karakter`}
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
            placeholder='Kategori sıralamasını belirleyiniz'
            disabled={isLoading}
          />

          <FormControl fullWidth>
            <InputLabel>Kategori Slider</InputLabel>
            <Select
              value={formData.sliderId}
              label='Kategori Slider'
              onChange={(e) => setFormData({ ...formData, sliderId: e.target.value })}
              disabled={isLoading || loadingSliders}
            >
              {sliders.map((slider) => (
                <MenuItem key={slider._id} value={slider._id}>
                  {slider.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

export default EditCategoryDrawer