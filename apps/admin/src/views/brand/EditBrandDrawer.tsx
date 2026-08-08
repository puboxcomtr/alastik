'use client'

import { useEffect, useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import type { BrandType } from '@/types/apps/brandTypes'

// API Imports
import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

import { toast } from 'react-toastify'

import { getActiveSite, getSiteLabel } from '@/utils/activeSite'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

type Props = {
  open: boolean
  brandData: BrandType[]
  selectedbrand: BrandType | null
  setData: (data: BrandType[]) => void
  handleClose: () => void
}

const EditBrandDrawer = ({ open, handleClose, brandData, selectedbrand, setData }: Props) => {
  const [fileName, setFileName] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [formData, setFormData] = useState({
    description: '',
    seoTitle: '',
    seoDescription: '',
    seoUrl: '',
    webOrder: 0,
    webVisible: true
  })

  useEffect(() => {
    if (selectedbrand) {
      setFormData({
        description: selectedbrand.description || '',
        seoTitle: selectedbrand.seoTitle || selectedbrand.name || '',
        seoDescription: selectedbrand.seoDescription || `${selectedbrand.name} markası ürünleri`,
        seoUrl: selectedbrand.seoUrl || '',
        webOrder: selectedbrand.webOrder || 0,
        webVisible: selectedbrand.webVisible !== false
      })

      // Logo preview ayarla
      if (selectedbrand.logo) {
        const logoUrl = typeof selectedbrand.logo === 'string'
          ? selectedbrand.logo
          : selectedbrand.logo.url || selectedbrand.logo
        setLogoPreview(getImageUrl(logoUrl))
        const imgParts = logoUrl.split('/')
        setFileName(imgParts[imgParts.length - 1] || '')
      } else {
        setLogoPreview(null)
        setFileName('')
      }
    } else {
      setFormData({
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoUrl: '',
        webOrder: 0,
        webVisible: true
      })
      setLogoPreview(null)
      setFileName('')
    }
  }, [selectedbrand])

  // Slug oluşturucu
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
    if (!selectedbrand?.name || selectedbrand.name.trim() === '') {
      toast.error('Marka adı bulunamadı')
      return
    }

    const generatedUrl = generateSlug(selectedbrand.name)

    setFormData(prev => ({
      ...prev,
      seoUrl: generatedUrl
    }))

    toast.success('SEO URL otomatik oluşturuldu')
  }

  // Logo yükleme
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (!files || files.length === 0 || !selectedbrand) return

    const file = files[0]
    setFileName(file.name)
    setIsUploading(true)

    // Önizleme göster
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // API'ye yükle
    const formDataUpload = new FormData()
    formDataUpload.append('logo', file)
    try {
      const result = await fetchAPI(`${API_URL}/admin/brands/${selectedbrand.id}/logo`, {
        method: 'POST',
        body: formDataUpload
      })

      if (result.success) {
        toast.success('Logo başarıyla yüklendi')

        // Data'yı güncelle
        const updatedBrandData = brandData.map(brand => {
          if (brand.id === selectedbrand.id) {
            return {
              ...brand,
              logo: result.data.url
            }
          }
          return brand
        })
        setData(updatedBrandData)
      } else {
        toast.error(result.message || 'Logo yüklenemedi')
        setLogoPreview(null)
        setFileName('')
      }
    } catch (error) {
      console.error('Logo upload error:', error)
      toast.error('Logo yüklenirken hata oluştu')
      setLogoPreview(null)
      setFileName('')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Logo silme
  const handleDeleteLogo = async () => {
    if (!selectedbrand) return

    try {
      const result = await fetchAPI(API_ENDPOINTS.brands.detail(selectedbrand.id) + '/logo', {
        method: 'DELETE'
      })

      if (result.success) {
        toast.success('Logo silindi')
        setLogoPreview(null)
        setFileName('')

        const updatedBrandData = brandData.map(brand => {
          if (brand.id === selectedbrand.id) {
            return {
              ...brand,
              logo: null
            }
          }
          return brand
        })
        setData(updatedBrandData)
      } else {
        toast.error(result.message || 'Logo silinemedi')
      }
    } catch (error) {
      console.error('Logo delete error:', error)
      toast.error('Logo silinirken hata oluştu')
    }
  }

  const onSubmit = async () => {
    if (!selectedbrand || isLoading) return

    setIsLoading(true)

    try {
      const result = await fetchAPI(API_ENDPOINTS.brands.detail(selectedbrand.id), {
        method: 'PATCH',
        body: JSON.stringify({
          description: formData.description,
          seoTitle: formData.seoTitle,
          seoDescription: formData.seoDescription,
          seoUrl: formData.seoUrl,
          webOrder: formData.webOrder,
          webVisible: formData.webVisible
        })
      })

      if (result.success && result.data) {
        const updatedBrandData = brandData.map(brand => {
          if (brand.id === selectedbrand.id) {
            return {
              ...brand,
              description: formData.description,
              seoTitle: formData.seoTitle,
              seoDescription: formData.seoDescription,
              seoUrl: formData.seoUrl,
              webOrder: formData.webOrder,
              webVisible: formData.webVisible
            }
          }
          return brand
        })

        setData(updatedBrandData)
        toast.success(`${selectedbrand.name} markası başarıyla güncellendi!`)
        handleClose()
      } else {
        toast.error(result.message || 'Marka güncellenirken hata oluştu')
      }
    } catch (error) {
      console.error('API hatası:', error)
      toast.error('Sunucuya ulaşılamıyor. Lütfen tekrar deneyin.')
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

          {/* Logo Önizleme ve Yükleme */}
          <Box>
            <Typography variant='body2' className='mb-2 font-medium'>Marka Logosu</Typography>
            <Box className='flex items-center gap-4'>
              <Box
                className='border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden'
                sx={{ width: 100, height: 100 }}
              >
                {isUploading ? (
                  <CircularProgress size={24} />
                ) : logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className='w-full h-full object-contain p-2'
                  />
                ) : (
                  <i className='ri-image-line text-3xl text-gray-400' />
                )}
              </Box>

              <Box className='flex flex-col gap-2'>
                <Button
                  component='label'
                  variant='outlined'
                  size='small'
                  disabled={isLoading || isUploading}
                  startIcon={<i className='ri-upload-2-line' />}
                >
                  {isUploading ? 'Yükleniyor...' : 'Logo Yükle'}
                  <input
                    hidden
                    type='file'
                    accept='image/*'
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                  />
                </Button>
                {logoPreview && (
                  <Button
                    variant='outlined'
                    color='error'
                    size='small'
                    onClick={handleDeleteLogo}
                    disabled={isLoading || isUploading}
                    startIcon={<i className='ri-delete-bin-line' />}
                  >
                    Logoyu Sil
                  </Button>
                )}
                {fileName && (
                  <Typography variant='caption' color='text.secondary'>
                    {fileName}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

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
                  /marka/
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position='end'>
                  <Tooltip title='Marka adından otomatik URL oluştur'>
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
            placeholder='Marka sıralamasını belirleyiniz'
            disabled={isLoading}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.webVisible}
                onChange={(e) => setFormData({ ...formData, webVisible: e.target.checked })}
                disabled={isLoading}
              />
            }
            label={`${getSiteLabel(getActiveSite())} sitesinde görünür`}
          />

          <div className='flex items-center gap-4'>
            <Button
              variant='contained'
              type='submit'
              disabled={isLoading || isUploading}
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
            <Button
              variant='outlined'
              color='error'
              onClick={handleDiscard}
              disabled={isLoading || isUploading}
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