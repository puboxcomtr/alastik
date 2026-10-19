'use client'

import { useRouter } from 'next/navigation'

import { Typography, Button } from '@mui/material'

import { useProductUpdate } from '@/contexts/ProductUpdateContext'

import type { ProductType } from '@/types/apps/productTypes'

interface ProductHeaderProps {
  product?: ProductType | null
}

const ProductHeader = ({ product }: ProductHeaderProps) => {
  const router = useRouter()
  const {
    hasChanges,
    isLoading,
    saveChanges,
    updateData
  } = useProductUpdate()

  const handleSave = async () => {
    const success = await saveChanges()
  }

  const changedFieldsCount = Object.keys(updateData).length

  return (
    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col' style={{ gap: '10px' }}>
      <div className='flex items-center gap-3'>
        <Typography variant='h4' className='mbe-1'>
          Ürünü Düzenle
        </Typography>

        {product?.sku && (
          <Typography variant="body2" color="text.secondary">
            Stok Kodu: {product.sku}
          </Typography>
        )}
      </div>

      <div className='flex flex-wrap max-sm:flex-col' style={{ gap: '15px' }}>
        <Button
          variant='outlined'
          color='secondary'
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Geri Dön
        </Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          color={hasChanges ? "primary" : "inherit"}
        >
          {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </Button>
      </div>
    </div>
  )
}

export default ProductHeader