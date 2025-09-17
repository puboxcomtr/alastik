// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import CircularProgress from '@mui/material/CircularProgress'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

type CategoryType = {
  _id: string
  subCategories: string[]
  count: number
}

type BrandType = {
  name: string
  count: number
}

const TableFilters = ({
  setData,
  productData,
  setLoading
}: {
  setData: (data: ProductType[]) => void
  productData?: ProductType[]
  setLoading: (loading: boolean) => void
}) => {

  // States
  const [stock, setStock] = useState('')
  const [searchText, setSearchText] = useState('')
  const [mainCategory, setMainCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [subCategories, setSubCategories] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [brand, setBrand] = useState('')
  const [brandData, setBrandData] = useState<BrandType[]>([])

  // Marka verilerini çek
  useEffect(() => {
    fetch('http://localhost:3082/api/brands')
      .then(res => res.json())
      .then(data => setBrandData(data.data || []))
      .catch(err => console.error('Brand fetch error:', err))
  }, [])

  // Kategori verilerini çek
  useEffect(() => {
    setCategoriesLoading(true)
    fetch('http://localhost:3082/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCategories(data.data || [])
        }
      })
      .catch(error => console.error('Kategori yükleme hatası:', error))
      .finally(() => setCategoriesLoading(false))
  }, [])

  // Ana kategori değiştiğinde alt kategorileri güncelle
  useEffect(() => {
    if (mainCategory) {
      const selected = categories.find(cat => cat._id === mainCategory)
      setSubCategories(selected?.subCategories || [])
      setSubCategory('')
    } else {
      setSubCategories([])
      setSubCategory('')
    }
  }, [mainCategory, categories])

  // Ürün filtreleme API çağrısı
  useEffect(() => {
    if (productData) {
      setLoading(true)
      const params = new URLSearchParams()

      // Ürün Adı SKU filtresi
      if (searchText && searchText.trim() !== '') {
        params.append('search', searchText.trim())
      }

      // Durum filtresi
      if (stock === 'In Stock') {
        params.append('web_status', 'active')
      } else if (stock === 'Out of Stock') {
        params.append('web_status', 'inactive')
      }

      // Kategori filtreleri
      if (mainCategory) {
        params.append('main_category', mainCategory)
      }
      if (subCategory) {
        params.append('sub_category', subCategory)
      }

      // Marka filtresi
      if (brand && brand !== '') {
        params.append('brand', brand)
      }


      fetch(`http://localhost:3082/api/products?${params}`)
        .then(res => res.json())
        .then(data => {
          setData(data.data || [])
        })
        .catch(error => {
          console.error('Filter error:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [stock, mainCategory, subCategory, brand, searchText, productData, setData, setLoading])

  return (
    <CardContent>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 2 }}>
          <TextField
            fullWidth
            label="Stok Kodu"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            variant="outlined"
            placeholder="Arama yapın..."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth>
            <InputLabel id='stock-select'>Durum</InputLabel>
            <Select
              fullWidth
              id='select-stock'
              value={stock}
              onChange={e => setStock(e.target.value)}
              label='Durum'
              labelId='stock-select'
            >
              <MenuItem value=''>Tümü</MenuItem>
              <MenuItem value='In Stock'>Aktif</MenuItem>
              <MenuItem value='Out of Stock'>Pasif</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth>
            <InputLabel id='main-category-select'>Ana Kategori</InputLabel>
            <Select
              fullWidth
              id='select-main-category'
              value={mainCategory}
              onChange={e => setMainCategory(e.target.value)}
              label='Ana Kategori'
              labelId='main-category-select'
              disabled={categoriesLoading}
            >
              <MenuItem value=''>Tümü</MenuItem>
              {categoriesLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} /> Yükleniyor...
                </MenuItem>
              ) : (
                categories.map(cat => (
                  <MenuItem key={cat._id} value={cat._id}>
                    {cat._id} ({cat.count})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <FormControl fullWidth>
            <InputLabel id='sub-category-select'>Alt Kategori</InputLabel>
            <Select
              fullWidth
              id='select-sub-category'
              value={subCategory}
              onChange={e => setSubCategory(e.target.value)}
              label='Alt Kategori'
              labelId='sub-category-select'
              disabled={!mainCategory || subCategories.length === 0}
            >
              <MenuItem value=''>Tümü</MenuItem>
              {subCategories
                .filter(subCat => subCat && subCat.trim() !== '')
                .map(subCat => (
                  <MenuItem key={subCat} value={subCat}>
                    {subCat}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Marka</InputLabel>
            <Select value={brand} label='Marka' onChange={(e) => setBrand(e.target.value)}>
              <MenuItem value=''>Tümü</MenuItem>
              {brandData.map((brandItem) => (
                <MenuItem key={brandItem.name} value={brandItem.name}>
                  {brandItem.name} ({brandItem.count})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default TableFilters