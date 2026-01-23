'use client'

import { useEffect, useState } from 'react'
import type { CategoryType } from '@/types/apps/productTypes'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import { toast } from 'react-toastify'

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
      const result = await fetchAPI(`${API_ENDPOINTS.categories.list()}/sliders/list`)
      if (result.success && result.data) {
        setSliders(result.data)
      }
    } catch (error) {
      console.error('Slider listesi yuklenemedi:', error)
    } finally {
      setLoadingSliders(false)
    }
  }

  // Drawer açıldığında slider listesini yükle
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
      const result = await fetchAPI(API_ENDPOINTS.categories.detail(selectedCategory.id), {
        method: 'PATCH',
        body: JSON.stringify({
          description: formData.description,
          seoTitle: formData.seoTitle,
          seoDescription: formData.seoDescription,
          seoUrl: formData.seoUrl,
          webOrder: formData.webOrder,
          sliderId: formData.sliderId || null
        })
      })

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
        toast.success(`${selectedCategory.name} kategorisi basariyla guncellendi!`)
        handleClose()
      } else {
        toast.error(`Guncelleme Hatasi: ${result.message || 'Kategori guncellenirken hata olustu'}`)
      }
    } catch (error) {
      console.error('API hatasi:', error)
      toast.error('Baglanti Hatasi: Sunucuya ulasilamiyor. Lutfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscard = () => {
    handleClose()
  }
  const generateSlug = (text: string): string => {
    const turkishMap: Record<string, string> = {
      'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
      'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
      'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
    }

    return text
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleAutoGenerateSeoUrl = () => {
    if (!selectedCategory?.name || selectedCategory.name.trim() === '') {
      toast.error('Kategori adi bulunamadi')
      return
    }

    const generatedUrl = generateSlug(selectedCategory.name)

    setFormData(prev => ({
      ...prev,
      seoUrl: generatedUrl
    }))

    toast.success('SEO URL otomatik olusturuldu')
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
        <Typography variant='h5'>Kategori Duzenle</Typography>
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
            placeholder='Kategori Açıklaması Giriniz'
            disabled={isLoading}
          />

          <TextField
            fullWidth
            label='SEO Baslik'
            value={formData.seoTitle}
            onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
            placeholder='SEO Başlık Giriniz'
            disabled={isLoading}
          />

          <TextField
            fullWidth
            multiline
            minRows={3}
            label='SEO Açıklama'
            value={formData.seoDescription}
            onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
            placeholder='SEO Açıklaması Giriniz'
            disabled={isLoading}
            inputProps={{ maxLength: 160 }}
            helperText={`${formData.seoDescription.length}/160 karakter`}
          />

          <TextField
            fullWidth
            label='SEO URL'
            value={formData.seoUrl}
            onChange={(e) => setFormData({ ...formData, seoUrl: e.target.value })}
            placeholder='SEO URL Giriniz'
            disabled={isLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment
                  position='start'
                  sx={{
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    paddingX: 1,
                    marginRight: 1,
                    color: 'text.secondary',
                    fontSize: '0.85rem'
                  }}
                >
                  /kategori/
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position='end'>
                  <Tooltip title='Kategori adından otomatik URL oluştur'>
                    <IconButton
                      size='small'
                      onClick={handleAutoGenerateSeoUrl}
                      edge='end'
                      disabled={isLoading}
                    >
                      <i className='ri-sparkling-line' />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />

          <TextField
            fullWidth
            type='number'
            label='Öncelik'
            value={formData.webOrder}
            onChange={(e) => setFormData({ ...formData, webOrder: Number(e.target.value) })}
            placeholder='Kategori Sıralamasını Belirleyiniz'
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
              Vazgec
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default EditCategoryDrawer