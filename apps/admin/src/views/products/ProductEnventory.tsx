'use client'
// React Imports
import { useState, useEffect } from 'react'
import type { SyntheticEvent } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select from '@mui/material/Select'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

// Component Imports
import Link from '@components/Link'
import CustomTabList from '@core/components/mui/TabList'

/* Json TS Export */
import type { ProductType } from '@/types/apps/productTypes'
import { InputAdornment } from '@mui/material'
export interface ProductEnventoryProps {
  product: ProductType
}

const ProductEnventory = ({ product }: ProductEnventoryProps) => {
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoUrl, setSeoUrl] = useState('')
  const [value, setValue] = useState('cargo_time')

  // States
  useEffect(() => {
    setSeoTitle(product.seo_title || '')
    setSeoDescription(product.seo_description || '')
    setSeoUrl(product.seo_url || '')
  }, [product])
  const [activeTab, setActiveTab] = useState('seo')

  // Hooks
  const theme = useTheme()
  const isBelowMdScreen = useMediaQuery(theme.breakpoints.down('md'))

  const handleChange = (event: SyntheticEvent, value: string) => {
    setActiveTab(value)
  }

  return (
    <Card>
      <CardHeader title='Ek Alanlar' />
      <CardContent>
        <TabContext value={activeTab}>
          <div className='flex flex-col gap-6'>
            <CustomTabList onChange={handleChange} pill='true'>
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
                  <Grid size={{ xs: 12, sm: 12, md: 12 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='SEO Başlığı'
                        placeholder='SEO Başlığı'
                        value={seoTitle}
                        onChange={e => setSeoTitle(e.target.value)}
                        required
                        inputProps={{ maxLength: 100 }}
                        helperText={
                          <div className="flex justify-between items-center">
                            <span>Bu alan arama motorlarında görünecek başlıktır</span>
                            <span className="flex items-center gap-1">
                              <span className={seoTitle.length <= 70 ? "text-green-500" : "text-red-500"}>
                                {seoTitle.length}/70
                              </span>
                            </span>
                          </div>
                        }
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 12 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='SEO Açıklaması'
                        placeholder='SEO Açıklaması'
                        value={seoDescription}
                        onChange={e => setSeoDescription(e.target.value)}
                        required
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 12 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidthx
                        label='SEO URL'
                        placeholder='SEO URL Giriniz'
                        value={seoUrl}
                        onChange={e => setSeoUrl(e.target.value)}
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
                              https://siteadi.com/urun/
                            </InputAdornment>
                          )
                        }}
                      />
                    </FormControl>
                  </Grid>
                </Grid>
              </FormGroup>
            </TabPanel>
            <TabPanel value='price'>
              <FormGroup className='flex flex-col gap-4'>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='Alış Fiyatı'
                        placeholder='Alış Fiyatı Giriniz'
                        value={product.price ? product.price.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='Satış Fiyatı'
                        placeholder='Satış Fiyatı Giriniz'
                        value={product.price2 ? product.price2.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='İndirimli Satış Fiyatı'
                        placeholder='İndirimli Satış Fiyatı Giriniz'
                        value={product.price3 ? product.price3.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography className='font-medium'>Ek Fiyat Alanları</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='Fiyat 4'
                        placeholder='Fiyat 4 Giriniz'
                        value={product.price4 ? product.price4.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='Fiyat 5'
                        placeholder='Fiyat 5 Giriniz'
                        value={product.price5 ? product.price5.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <TextField
                        fullWidth
                        label='Fiyat 6'
                        placeholder='Fiyat 6 Giriniz'
                        value={product.price6 ? product.price6.toLocaleString('tr-TR') + " TL" : "0 TL"}
                        disabled
                        required
                      />
                    </FormControl>
                  </Grid>
                </Grid>
              </FormGroup>
            </TabPanel>
            <TabPanel value='advanced'>
              <Typography className='font-medium mbe-2'>Ürün Görünümü</Typography>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <FormControlLabel
                      control={<Checkbox />}
                      label={
                        <Typography className='font-medium' color='text.primary'>
                          Ziyaretçi Görebilir
                        </Typography>
                      }
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                  <FormControlLabel
                    control={<Checkbox />}
                    className='mbe-2'
                    label={
                      <Typography className='font-medium' color='text.primary'>
                        Üye Görebilir
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
              <hr className='border-t border-gray-300 my-4' />
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 12, md: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel id='select-label'>Kargolanma Süresi</InputLabel>
                    <Select
                      labelId='select-label'
                      value={value}
                      label='Lütfen Seçim Yapınız'
                      onChange={e => setValue(e.target.value)}
                    >
                      <MenuItem value='today'>Aynı Gün</MenuItem>
                      <MenuItem value='tomorrow'>Ertesi Gün</MenuItem>
                      <MenuItem value='nextWeek'>Gelecek Hafta</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <hr className='border-t border-gray-300 my-4' />

              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 12, md: 12 }}>
                  <FormControl fullWidth>
                    <Grid container spacing={5}>
                      <Grid size={{ xs: 12, sm: 12, md: 12 }}>
                        <FormControl fullWidth>
                          <FormControlLabel
                            control={<Checkbox />}
                            label={
                              <Typography className='font-medium' color='text.primary'>
                                Sadece Stok ve Fiyatları Dia ile eşleştirsin.
                              </Typography>
                            }
                          />
                        </FormControl>
                      </Grid>
                    </Grid>
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
