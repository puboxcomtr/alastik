'use client'

import { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid2'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'

import Payment from './Payment'
import ProductManagament from './ProductManagament'
import ShowcaseManagement from './ShowcaseManagement'
import { getSettings, updateSettings } from '@/utils/api/settings'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

const Showcase = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    // Payment
    saleAgree: false,
    paymentSystem: false,

    // Product Management
    hidePricelessProducts: false,
    recommendedProducts: false,
    autoCommentApproval: '1',
    commentFieldRequirement: '1',

    // Showcase Management
    productsPerPage: 20,
    showcaseProductSize: '1024x1024',
    notPicture: false,
    pictureOptimization: false,
    watermark: false,
    watermarkPosition: 'sol-ust',
    watermarkRotation: 0,
    watermarkWidth: 25,
    watermarkOpacity: 30,
    watermarkExcludedCategories: [],
    watermarkImage: null,
    watermarkImagePreview: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await getSettings('showcase')

      if (response.success) {
        setFormData({
          saleAgree: response.data.saleAgree || false,
          paymentSystem: response.data.paymentSystem || false,
          hidePricelessProducts: response.data.hidePricelessProducts || false,
          recommendedProducts: response.data.recommendedProducts || false,
          autoCommentApproval: response.data.autoCommentApproval || '1',
          commentFieldRequirement: response.data.commentFieldRequirement || '1',
          productsPerPage: response.data.productsPerPage || 20,
          showcaseProductSize: response.data.showcaseProductSize || '1024x1024',
          notPicture: response.data.notPicture || false,
          pictureOptimization: response.data.pictureOptimization || false,
          watermark: response.data.watermark || false,
          watermarkPosition: response.data.watermarkPosition || 'sol-ust',
          watermarkRotation: Number(response.data.watermarkRotation) || 0,
          watermarkWidth: Number(response.data.watermarkWidth) || 25,
          watermarkOpacity: Number.isFinite(Number(response.data.watermarkOpacity))
            ? Number(response.data.watermarkOpacity)
            : 30,
          watermarkExcludedCategories: Array.isArray(response.data.watermarkExcludedCategories)
            ? response.data.watermarkExcludedCategories.map(String)
            : [],
          watermarkImage: null,
          watermarkImagePreview: response.data.watermarkImage || ''
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
      let watermarkImageUrl = formData.watermarkImagePreview

      // Yeni dosya seçildiyse medya kütüphanesine yüklenir ve adresi kaydedilir
      if (formData.watermarkImage instanceof File) {
        const uploadFormData = new FormData()

        uploadFormData.append('files', formData.watermarkImage)

        const uploadResponse = await fetchAPI(API_ENDPOINTS.media.upload('general'), {
          method: 'POST',
          body: uploadFormData
        })

        const yuklenen = uploadResponse?.data?.[0] || uploadResponse?.files?.[0]

        if (!yuklenen?.url) {
          throw new Error('Filigran görseli yüklenemedi')
        }

        watermarkImageUrl = yuklenen.url
      }

      const dataToSave = {
        saleAgree: formData.saleAgree,
        paymentSystem: formData.paymentSystem,
        hidePricelessProducts: formData.hidePricelessProducts,
        recommendedProducts: formData.recommendedProducts,
        autoCommentApproval: formData.autoCommentApproval,
        commentFieldRequirement: formData.commentFieldRequirement,
        productsPerPage: formData.productsPerPage,
        showcaseProductSize: formData.showcaseProductSize,
        notPicture: formData.notPicture,
        pictureOptimization: formData.pictureOptimization,
        watermark: formData.watermark,
        watermarkPosition: formData.watermarkPosition,
        watermarkRotation: formData.watermarkRotation,
        watermarkWidth: formData.watermarkWidth,
        watermarkOpacity: formData.watermarkOpacity,
        watermarkExcludedCategories: formData.watermarkExcludedCategories,
        watermarkImage: watermarkImageUrl
      }

      await updateSettings('showcase', dataToSave)

      toast.success('Vitrin ayarları kaydedildi')
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
          <Payment
            formData={formData}
            setFormData={setFormData}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <ProductManagament
            formData={formData}
            setFormData={setFormData}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <ShowcaseManagement
            formData={formData}
            setFormData={setFormData}
          />
        </Grid>

        <Grid size={{ xs: 12 }} className='flex gap-4 flex-wrap justify-end'>
          <Button
            variant='contained'
            type='submit'
            disabled={saving}
          >
            {saving ? 'Kaydediliyor...' : 'Tüm Değişiklikleri Kaydet'}
          </Button>
        </Grid>
      </Grid>
    </form>
  )
}

export default Showcase