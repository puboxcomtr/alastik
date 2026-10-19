'use client'

import { useState, useEffect } from 'react'
import { getSiteUrl } from '@/utils/activeSite'
import type { SyntheticEvent } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import { InputAdornment } from '@mui/material'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import FormGroup from '@mui/material/FormGroup'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import TextField from '@mui/material/TextField'

import { useProductUpdate } from '@/contexts/ProductUpdateContext'

import CustomTabList from '@/@core/components/mui/TabList'
import SeoLivePanel from '@/views/seo-module/SeoLivePanel'

import type { ProductEnventoryProps } from '@/types/apps/productTypes'

const ProductEnventory = ({ product }: ProductEnventoryProps) => {
  const { updateField } = useProductUpdate()

  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoUrl, setSeoUrl] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [delivery, setDelivery] = useState('same_day')
  const [activeTab, setActiveTab] = useState('seo')

  useEffect(() => {
    setSeoTitle(product.seoTitle || '')
    setSeoDescription(product.seoDescription || '')
    setSeoUrl(product.seoUrl || '')
    setFocusKeyword(product.focusKeyword || '')
    setDelivery(product.delivery || 'same_day')
  }, [product])

  const handleTabChange = (event: SyntheticEvent, value: string) => {
    setActiveTab(value)
  }

  const handleSeoTitleChange = (value: string) => {
    setSeoTitle(value)
    updateField('seoTitle', value)
  }

  const handleSeoDescriptionChange = (value: string) => {
    setSeoDescription(value)
    updateField('seoDescription', value)
  }

  const handleSeoUrlChange = (value: string) => {
    const cleanUrl = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

    setSeoUrl(cleanUrl)
    updateField('seoUrl', cleanUrl)
  }

  const handleFocusKeywordChange = (value: string) => {
    setFocusKeyword(value)
    updateField('focusKeyword', value)
  }

  const handleDeliveryChange = (value: string) => {
    setDelivery(value)
    updateField('delivery', value)
  }

  return (
    <Card>
      <CardHeader title='Ek Alanlar' />
      <CardContent>
        <TabContext value={activeTab}>
          <div className='flex flex-col gap-6'>
            <CustomTabList onChange={handleTabChange} pill='true'>
              <Tab value='seo' label='SEO Bilgileri' icon={<i className='ri-seo-line' />} iconPosition='start' />
              <Tab
                value='price'
                label='Fiyat ve Kargo'
                icon={<i className='ri-price-tag-3-fill' />}
                iconPosition='start'
              />
              <Tab value='advanced' label='Diğer Özellikler' icon={<i className='ri-link-m' />} iconPosition='start' />
            </CustomTabList>

            <TabPanel value='seo'>
              <FormGroup className='flex flex-col gap-4'>
                <Grid container spacing={10}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='SEO Başlığı'
                        placeholder='SEO Başlığı'
                        value={seoTitle}
                        onChange={e => handleSeoTitleChange(e.target.value)}
                        required
                        inputProps={{ maxLength: 100 }}
                        helperText={
                          <span className="flex justify-between items-center">
                            <span>Bu alan arama motorlarında görünecek başlıktır</span>
                            <span className="flex items-center gap-1">
                              <span className={seoTitle.length <= 70 ? "text-green-500" : "text-red-500"}>
                                {seoTitle.length}/70
                              </span>
                            </span>
                          </span>
                        }
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='SEO Açıklaması'
                        placeholder='SEO Açıklaması'
                        value={seoDescription}
                        onChange={e => handleSeoDescriptionChange(e.target.value)}
                        required
                        multiline
                        rows={3}
                        inputProps={{ maxLength: 160 }}
                        helperText={
                          <span className="flex justify-between items-center">
                            <span>Bu alan arama motorlarında açıklama olarak görünecektir</span>
                            <span className="flex items-center gap-1">
                              <span className={seoDescription.length <= 160 ? "text-green-500" : "text-red-500"}>
                                {seoDescription.length}/160
                              </span>
                            </span>
                          </span>
                        }
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='SEO URL'
                        placeholder='SEO URL Giriniz'
                        value={seoUrl}
                        onChange={e => handleSeoUrlChange(e.target.value)}
                        required
                        InputProps={{
                          startAdornment: (
                            <InputAdornment
                              sx={{
                                backgroundColor: '#f0f0f0',
                                borderRadius: '4px',
                                paddingX: 1,
                                color: 'gray',
                                fontSize: '0.9rem'
                              }}
                              position='start'
                            >
                              {getSiteUrl()}/urun/
                            </InputAdornment>
                          )
                        }}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <SeoLivePanel
                      type='product'
                      focusKeyword={focusKeyword}
                      onFocusKeywordChange={handleFocusKeywordChange}
                      title={seoTitle || product.name || ''}
                      description={seoDescription}
                      slug={seoUrl}
                      content={product.description || product.customDescription || ''}
                      keywords={product.seoKeywords || []}
                      refId={product._key}
                      galleryImages={(product.images?.length || 0) + (product.customImages?.length || 0)}
                    />
                  </Grid>
                </Grid>
              </FormGroup>
            </TabPanel>

            <TabPanel value='price'>
              <FormGroup className='flex flex-col gap-4'>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='Piyasa Fiyatı'
                        placeholder='Piyasa Giriniz'
                        value={product.price1 ? product.price1.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='Satış Fiyatı'
                        placeholder='Satış Fiyatı Giriniz'
                        value={product.price4 ? product.price4.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='İndirimli Satış Fiyatı'
                        placeholder='İndirimli Satış Fiyatı Giriniz'
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>
                </Grid>
              </FormGroup>
            </TabPanel>

            <TabPanel value='advanced'>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel id='delivery-label'>Kargolanma Süresi</InputLabel>
                    <Select
                      labelId='delivery-label'
                      value={delivery}
                      label='Kargolanma Süresi'
                      onChange={e => handleDeliveryChange(e.target.value)}
                    >
                      <MenuItem value='same_day'>Aynı Gün</MenuItem>
                      <MenuItem value='next_day'>Ertesi Gün</MenuItem>
                      <MenuItem value='next_week'>Gelecek Hafta</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </TabPanel>
          </div>
        </TabContext>
      </CardContent>
    </Card>
  )
}

export default ProductEnventory