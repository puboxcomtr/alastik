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
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

export interface ProductBrandProps {
  product: ProductType
}

const ProductBrand = ({ product }: ProductBrandProps) => {
  // Context hook
  const { updateField } = useProductUpdate()

  // States
  const [webVisible, setWebVisible] = useState(true)
  const [hideBrand, setHideBrand] = useState(false)
  const [hideProductionDate, setHideProductionDate] = useState(false)
  const [hideStock, setHideStock] = useState(false)
  const [hideDelivery, setHideDelivery] = useState(false)

  // Initialize values
  useEffect(() => {
    setWebVisible(product.webVisible ?? true)
    setHideBrand(product.hideBrand ?? false)
    setHideProductionDate(product.hideProductionDate ?? false)
    setHideStock(product.hideStock ?? false)
    setHideDelivery(product.hideDelivery ?? false)
  }, [product])

  // Ürün durumu değişiklik handler
  const handleStatusChange = (value: string) => {
    const isVisible = value === 'Aktif'
    setWebVisible(isVisible)
    updateField('webVisible', isVisible)
  }

  // Marka gizleme değişiklik handler
  const handleHideBrandChange = (checked: boolean) => {
    setHideBrand(checked)
    updateField('hideBrand', checked)
  }

  // Üretim tarihi gizleme değişiklik handler
  const handleHideProductionDateChange = (checked: boolean) => {
    setHideProductionDate(checked)
    updateField('hideProductionDate', checked)
  }

  // Stok gizleme değişiklik handler
  const handleHideStockChange = (checked: boolean) => {
    setHideStock(checked)
    updateField('hideStock', checked)
  }

  // Kargo bilgisi gizleme değişiklik handler
  const handleHideDeliveryChange = (checked: boolean) => {
    setHideDelivery(checked)
    updateField('hideDelivery', checked)
  }

  return (
    <Card>
      <CardHeader title='Marka ve Durum Bilgileri' />
      <CardContent>
        <div className='flex flex-col gap-5'>
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

          <TextField
            fullWidth
            label='Marka'
            value={product.brand || 'Marka Bulunamadı'}
            disabled
            InputProps={{
              readOnly: true,
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={hideBrand}
                onChange={e => handleHideBrandChange(e.target.checked)}
              />
            }
            label='Markayı Gizle (kategori/vitrin kartlarında marka gösterilmez)'
          />

          <FormControlLabel
            control={
              <Switch
                checked={hideProductionDate}
                onChange={e => handleHideProductionDateChange(e.target.checked)}
              />
            }
            label='Üretim Tarihini Gizle (kartlarda üretim tarihi gösterilmez)'
          />

          <FormControlLabel
            control={
              <Switch
                checked={hideStock}
                onChange={e => handleHideStockChange(e.target.checked)}
              />
            }
            label='Stok Bilgisini Gizle (kartlarda stok adedi gösterilmez)'
          />

          <FormControlLabel
            control={
              <Switch
                checked={hideDelivery}
                onChange={e => handleHideDeliveryChange(e.target.checked)}
              />
            }
            label='Kargo Bilgisini Gizle (ürün detayında kargoya teslim tarihi gösterilmez)'
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default ProductBrand