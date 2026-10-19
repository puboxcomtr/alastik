'use client'

import React, { useState, useEffect } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import type { ProductFeaturesProps } from '@/types/apps/productTypes'

const ProductFeatures = ({ product }: ProductFeaturesProps) => {
  const [diaFeatures, setDiaFeatures] = useState<Array<{ name: string, value: string }>>([])

  useEffect(() => {
    if (product?.properties) {
      const features = Object.entries(product.properties)
        .filter(([key]) => key !== 'm_kategoriler')
        .map(([name, value]) => ({
          name,
          value: String(value)
        }))

      setDiaFeatures(features)
    }
  }, [product])

  return (
    <Card>
      <CardHeader title='Ürün Özellikleri' />
      <CardContent>
        {diaFeatures.length > 0 ? (
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
                    }}
                  >
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
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <i className='ri-information-line' style={{ fontSize: 64, color: '#ccc' }} />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Henüz ürün özelliği bulunmuyor
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductFeatures