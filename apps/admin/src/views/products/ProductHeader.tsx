'use client'

import { Typography, Button } from '@mui/material'
import { useRouter } from 'next/navigation'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

const ProductHeader = ({ product }: { product?: ProductType | null }) => {
  const router = useRouter()
  return (
    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col' style={{gap: '10px'}}>
      <div>
        <Typography variant='h4' className='mbe-1'>
          Ürünü Düzenle
        </Typography>
      </div>
      <div className='flex flex-wrap max-sm:flex-col' style={{gap: '15px'}}>
        <Button variant='outlined' color='secondary' onClick={() => router.back()}>
          Geri Dön
        </Button>
        <Button variant='contained'>Değişiklikleri Kaydet</Button>
      </div>
    </div>
  )
}

export default ProductHeader
