'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

// Component Imports
import CustomIconButton from '@core/components/mui/IconButton'

/* Json TS Export */
import type { ProductType } from '@/types/apps/ecommerceTypes'
export interface ProductInformationProps {
  product: ProductType
}

const ProductBrand = ({ product }: ProductInformationProps) => {
  // States
  const [vendor, setVendor] = useState('0')
  const [status, setStatus] = useState('Aktif')

  return (
    <Card>
      <CardHeader title='Ürün Seçim Bilgileri' />
      <CardContent>
        <form onSubmit={e => e.preventDefault()} className='flex flex-col gap-5'>
          <FormControl fullWidth>
            <InputLabel>Ürün Durumu Seçiniz</InputLabel>
            <Select label='Ürün Durumunu Seçiniz' value={status} onChange={e => setStatus(e.target.value)}>
              <MenuItem value='Aktif'>Aktif</MenuItem>
              <MenuItem value='Pasif'>Pasif</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Marka Seçiniz</InputLabel>
            <Select label='Select Vendor' value={vendor} onChange={e => setVendor(e.target.value)}>
              <MenuItem value={`0`}>Pirelli</MenuItem>
              <MenuItem value={`1`}>Lassa</MenuItem>
              <MenuItem value={`2`}>Bridgestone</MenuItem>
              <MenuItem value={`3`}>Michelin</MenuItem>
              <MenuItem value={`4`}>Hankook</MenuItem>
              <MenuItem value={`5`}>Petlas</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label={product.tag} placeholder={product.tag} disabled />
        </form>
      </CardContent>
    </Card>
  )
}

export default ProductBrand
