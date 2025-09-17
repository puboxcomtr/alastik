'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

// Component Imports
import CustomIconButton from '@core/components/mui/IconButton'

const ProductOrganize = () => {
  // States
  const [variants, setVariants] = useState([
    { group: 'Tire', value: '' },
    { group: 'Rims', value: '' },
    { group: 'Snow', value: '' }
  ])
  const variantOptions: Record<string, string[]> = {
    Tire: ['Yaz Lastiği', 'Kış Lastiği', '4 Mevsim Lastik'],
    Rims: ['Çelik Jant', 'Teneke Jant', 'Sıfır Jant'],
    Snow: ['205', '215', '225'],
    Sidewall: ['35', '45', '50', '55'],
    Diameter: ['R12', 'R13', 'R14', 'R15'],
    RFT: ['Sıfır', 'İkinci El']
  }
  return (
    <Card>
      <CardHeader title='Ürün Kategori Bilgileri' />
      <CardContent>
        <Grid container spacing={5}>
          {variants.map((variant, index) => (
            <Grid key={index} size={{ xs: 12 }} className='repeater-item'>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Ana Kategori</InputLabel>
                    <Select
                      label='Lütfen Seçiniz'
                      value={variant.group}
                      onChange={e => {
                        const updated = [...variants]
                        updated[index].group = e.target.value
                        updated[index].value = ''
                        setVariants(updated)
                      }}
                    >
                      <MenuItem value='Tire'>Lastik</MenuItem>
                      <MenuItem value='Rims'>Jant</MenuItem>
                      <MenuItem value='Snow'>Kar Paleti</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <div className='flex items-center gap-5'>
                    <FormControl fullWidth>
                      <InputLabel>Alt Kategori</InputLabel>
                      <Select
                        value={variant.value}
                        label='Değer Seç'
                        onChange={e => {
                          const updated = [...variants]
                          updated[index].value = e.target.value
                          setVariants(updated)
                        }}
                      >
                        {variantOptions[variant.group]?.map(opt => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <CustomIconButton
                      onClick={() => {
                        const updated = [...variants]
                        updated.splice(index, 1)
                        setVariants(updated)
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
              onClick={() => setVariants([...variants, { group: '', value: '' }])}
              startIcon={<i className='ri-add-line' />}
            >
              Ekle
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductOrganize
