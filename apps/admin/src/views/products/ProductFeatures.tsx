'use client'

// React Imports
import React, { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

interface ProductFeaturesProps {
  product?: ProductType
}

const ProductFeatures = ({ product }: ProductFeaturesProps) => {
  const [diaFeatures, setDiaFeatures] = useState<Array<{ name: string, value: string }>>([])
  const [allAvailableFeatures, setAllAvailableFeatures] = useState<Array<{ name: string, values: string[] }>>([])

  useEffect(() => {
    if (product?.properties) {
      const features = Object.entries(product.properties)
        .filter(([key, value]) => {
          return key !== 'm_kategoriler'
        })
        .map(([name, value]) => ({
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
          </>
        )}

      </CardContent>
    </Card>
  )
}

export default ProductFeatures