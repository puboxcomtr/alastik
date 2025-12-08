'use client'

// React Imports
import { useState, useEffect } from 'react'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

// Context
import { useProductUpdate } from '@/contexts/ProductUpdateContext'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

export interface ProductBrandProps {
  product: ProductType
}

const ProductBrand = ({ product }: ProductBrandProps) => {
  // Context hook
  const { updateField } = useProductUpdate()

  // States
  const [webVisible, setWebVisible] = useState(true)

  // Initialize values
  useEffect(() => {
    setWebVisible(product.webVisible ?? true)
  }, [product])

  // Ürün durumu değişiklik handler
  const handleStatusChange = (value: string) => {
    const isVisible = value === 'Aktif'
    setWebVisible(isVisible)
    updateField('webVisible', isVisible)
  }

  return (
    <Card>
      <CardHeader title='Ürün Seçim Bilgileri' />
      <CardContent>
        <form onSubmit={e => e.preventDefault()} className='flex flex-col gap-5'>
          <FormControl fullWidth>
            <InputLabel>Ürün Durumu</InputLabel>
            <Select
              label='Ürün Durumu'
              value={webVisible ? 'Aktif' : 'Pasif'}
              onChange={e => handleStatusChange(e.target.value)}
            >
              <MenuItem value='Aktif'>Aktif</MenuItem>
              <MenuItem value='Pasif'>Pasif</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <TextField
              fullWidth
              label='Marka'
              value={product.brand || 'Marka Bulunamadı'}
              disabled
              InputProps={{
                readOnly: true,
              }}
            />
          </FormControl>

          <TextField
            fullWidth
            label='Etiketler'
            value={product.tag || ''}
            placeholder="Ürün etiketleri"
            disabled
            InputProps={{
              readOnly: true,
            }}
          />
        </form>
      </CardContent>
    </Card>
  )
}

export default ProductBrand