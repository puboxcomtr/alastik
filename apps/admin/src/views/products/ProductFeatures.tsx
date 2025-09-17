'use client'

// React Imports
import React, { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

// Third-party Imports
import { toast } from 'react-toastify'

// Components Imports
import CustomIconButton from '@core/components/mui/IconButton'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

interface ProductFeaturesProps {
  product?: ProductType
}

const ProductFeatures = ({ product }: ProductFeaturesProps) => {
  const [diaFeatures, setDiaFeatures] = useState<Array<{ name: string, value: string }>>([])
  const [allAvailableFeatures, setAllAvailableFeatures] = useState<Array<{ name: string, values: string[] }>>([])
  const [customVariants, setCustomVariants] = useState([{ group: '', value: '' }])

  useEffect(() => {
    if (product?.properties) {
      const features = Object.entries(product.properties).map(([name, value]) => ({
        name,
        value: String(value)
      }))
      setDiaFeatures(features)
    }
  }, [product])

  // Tüm DIA özelliklerini yükle
  useEffect(() => {
    const fetchAllFeatures = async () => {
      try {
        const response = await fetch('http://localhost:3082/api/products/features/all')
        const data = await response.json()
        if (data.success) {
          setAllAvailableFeatures(data.data)
        }
      } catch (error) {
        console.error('Tüm özellikler yüklenemedi:', error)
      }
    }

    fetchAllFeatures()
  }, [])
  const handleRemoveDiaFeature = (featureName: string, index: number) => {
    toast.warn(
      <div>
        <p>Bu özelliği silmek istediğinize emin misiniz?</p>
        <div className="flex gap-2 mt-3">
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => {
              const updatedFeatures = diaFeatures.filter((_, i) => i !== index)
              setDiaFeatures(updatedFeatures)
              toast.dismiss()
              toast.success('Özellik başarıyla kaldırıldı (geçici)', {
                position: 'top-right'
              })
            }}
          >
            Sil
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toast.dismiss()}
          >
            İptal
          </Button>
        </div>
      </div>,
      {
        position: 'top-right',
        autoClose: false,
        closeButton: false,
        draggable: false
      }
    )
  }

  // Duplicate kontrol fonksiyonu
  const checkDuplicateFeature = (selectedGroup: string) => {
    const isDuplicate = diaFeatures.some(feature => feature.name === selectedGroup)
    if (isDuplicate) {
      toast.error('Bu özellik zaten mevcut! Önce mevcut özelliği silin.', {
        position: 'top-right'
      })
      return true
    }
    return false
  }

  // Seçilen özelliğin mevcut değerlerini getir
  const getValuesForFeature = (featureName: string) => {
    const feature = allAvailableFeatures.find(f => f.name === featureName)
    return feature ? feature.values : []
  }

  return (
    <Card>
      <CardHeader title='Ürün Özellikleri' />
      <CardContent>
        {diaFeatures.length > 0 && (
          <>
            <Box className="mb-4">
              <Grid container spacing={3}>
                {diaFeatures.map((feature, index) => (
                  <React.Fragment key={index}>
                    <Grid size={{ xs: 6, sm: 3 }} className="relative">
                      <TextField
                        fullWidth
                        label="Özellik Adı"
                        size="small"
                        value={feature.name}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        sx={{
                          '& .MuiInputBase-input': {
                            fontSize: '0.75rem'
                          },
                          '& .MuiInputLabel-root': {
                            fontWeight: '600'
                          }
                        }}
                      />
                      {/* Silme butonu */}
                      <IconButton
                        size="small"
                        className="absolute top-1 right-1"
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          '&:hover': {
                            backgroundColor: 'rgba(255,0,0,0.1)',
                            color: 'red'
                          },
                          width: 32,
                          height: 32
                        }}
                        onClick={() => handleRemoveDiaFeature(feature.name, index)}
                      >
                        <i className='ri-close-line' style={{ fontSize: '14px' }} />
                      </IconButton>
                    </Grid>
                    <Grid
                      size={{ xs: 6, sm: 3 }}
                      sx={{
                        borderRight: {
                          xs: 'none',
                          sm: index % 2 === 1 ? 'none' : '1px solid #e0e0e0'
                        },
                        paddingRight: {
                          xs: 0,
                          sm: index % 2 === 1 ? 0 : 2
                        }
                      }}>
                      <TextField
                        fullWidth
                        label="Özellik Değeri"
                        size="small"
                        value={feature.value}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        sx={{
                          '& .MuiInputBase-input': {
                            fontSize: '0.75rem'
                          },
                          '& .MuiInputLabel-root': {
                            fontWeight: '600'
                          }
                        }}
                      />
                    </Grid>
                  </React.Fragment>
                ))}
              </Grid>
            </Box>

            <Typography variant='h6' gutterBottom className="mt-4">
              Ek Özellik Ekle
            </Typography>
          </>
        )}

        {/* Ek özellik ekleme */}
        <Grid container spacing={5}>
          {customVariants.map((variant, index) => (
            <Grid key={index} size={{ xs: 12 }} className='repeater-item'>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Özellik Başlığı</InputLabel>
                    <Select
                      label='Özellik Başlığı'
                      value={variant.group}
                      onChange={e => {
                        const selectedGroup = e.target.value

                        // Duplicate kontrol
                        if (checkDuplicateFeature(selectedGroup)) {
                          return // Duplicate varsa seçimi engelle
                        }

                        const updated = [...customVariants]
                        updated[index].group = selectedGroup
                        updated[index].value = ''
                        setCustomVariants(updated)
                      }}
                    >
                      {/* TÜM DIA özellikleri */}
                      {allAvailableFeatures.map(feature => (
                        <MenuItem key={feature.name} value={feature.name}>
                          {feature.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <div className='flex items-center gap-5'>
                    <FormControl fullWidth>
                      <InputLabel>Değer Seç</InputLabel>
                      <Select
                        value={variant.value}
                        label='Değer Seç'
                        onChange={e => {
                          const updated = [...customVariants]
                          updated[index].value = e.target.value
                          setCustomVariants(updated)
                        }}
                      >
                        {/* Seçilen özelliğin TÜM değerleri */}
                        {variant.group && getValuesForFeature(variant.group).map(value => (
                          <MenuItem key={value} value={value}>
                            {value}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <CustomIconButton
                      onClick={() => {
                        const updated = [...customVariants]
                        updated.splice(index, 1)
                        setCustomVariants(updated)
                      }}
                      className='min-is-fit'
                    >
                      <i className='ri-close-line' />
                    </CustomIconButton>
                  </div>
                </Grid>
              </Grid>
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <Button
              variant='contained'
              onClick={() => setCustomVariants([...customVariants, { group: '', value: '' }])}
              startIcon={<i className='ri-add-line' />}
            >
              Ek Özellik Ekle
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductFeatures