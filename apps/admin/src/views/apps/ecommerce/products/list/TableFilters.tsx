'use client'

import { useState, useEffect } from 'react'

import Grid from '@mui/material/Grid2'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type FilterOptions = {
  brands: string[]
  productTypes: string[]
  seasons: string[]
  mainCategories: string[]
  widths: string[]
  profiles: string[]
  rims: string[]
}

type Filters = {
  search: string
  sku: string
  brand: string
  product_type: string
  season: string
  main_category: string
  sub_category: string
  width: string
  profile: string
  rim: string
  stock_status: string
}

const TableFilters = ({
  onFilterChange
}: {
  onFilterChange: (filters: Record<string, string>) => void
}) => {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sku: '',
    brand: '',
    product_type: '',
    season: '',
    main_category: '',
    sub_category: '',
    width: '',
    profile: '',
    rim: '',
    stock_status: ''
  })

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brands: [],
    productTypes: [],
    seasons: [],
    mainCategories: [],
    widths: [],
    profiles: [],
    rims: []
  })

  const [subCategories, setSubCategories] = useState<string[]>([])

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    if (filters.main_category) {
      loadSubCategories(filters.main_category)
    } else {
      setSubCategories([])
    }
  }, [filters.main_category])

  const loadFilterOptions = async () => {
    try {
      const res = await fetchAPI(API_ENDPOINTS.filters.productOptions())
      if (res.success) {
        setFilterOptions(res.data)
      }
    } catch (err) {
      console.error('Filtre seçenekleri yüklenemedi:', err)
    }
  }

  const loadSubCategories = async (mainCategory: string) => {
    try {
      const res = await fetchAPI(API_ENDPOINTS.filters.subCategories(mainCategory))
      if (res.success) {
        setSubCategories(res.data)
      }
    } catch (err) {
      console.error('Alt kategoriler yüklenemedi:', err)
    }
  }

  const handleChange = (field: keyof Filters) => (e: any) => {
    const newFilters = { ...filters, [field]: e.target.value }

    if (field === 'main_category') {
      newFilters.sub_category = ''
    }

    setFilters(newFilters)
  }

  const handleSearch = () => {
    const params: Record<string, string> = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        params[key] = value.trim()
      }
    })
    onFilterChange(params)
  }

  const handleReset = () => {
    const empty: Filters = {
      search: '', sku: '', brand: '', product_type: '',
      season: '', main_category: '', sub_category: '',
      width: '', profile: '', rim: '', stock_status: ''
    }
    setFilters(empty)
    setSubCategories([])
    onFilterChange({})
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <CardContent>
      <Grid container spacing={3}>
        {/* Satır 1: Arama alanları */}
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            fullWidth
            size='small'
            label='Ürün Adı'
            placeholder='Ürün adı ile ara...'
            value={filters.search}
            onChange={handleChange('search')}
            onKeyDown={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='ri-search-line' />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            fullWidth
            size='small'
            label='Stok Kodu'
            placeholder='Stok kodu ile ara...'
            value={filters.sku}
            onChange={handleChange('sku')}
            onKeyDown={handleKeyPress}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Marka'
            value={filters.brand}
            onChange={handleChange('brand')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {filterOptions.brands.map(b => (
              <MenuItem key={b} value={b}>{b}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Ürün Tipi'
            value={filters.product_type}
            onChange={handleChange('product_type')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {filterOptions.productTypes.map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Mevsim'
            value={filters.season}
            onChange={handleChange('season')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {filterOptions.seasons.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Satır 2: Kategori + Ebat + Stok */}
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Ana Kategori'
            value={filters.main_category}
            onChange={handleChange('main_category')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {filterOptions.mainCategories.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Alt Kategori'
            value={filters.sub_category}
            onChange={handleChange('sub_category')}
            disabled={!filters.main_category || subCategories.length === 0}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {subCategories.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 4, sm: 1.5 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Genişlik'
            value={filters.width}
            onChange={handleChange('width')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {filterOptions.widths.map(w => (
              <MenuItem key={w} value={w}>{w}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 4, sm: 1.5 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Yanak'
            value={filters.profile}
            onChange={handleChange('profile')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {filterOptions.profiles.map(p => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 4, sm: 1.5 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Jant Çapı'
            value={filters.rim}
            onChange={handleChange('rim')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            {filterOptions.rims.map(r => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 1.5 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Stok'
            value={filters.stock_status}
            onChange={handleChange('stock_status')}
          >
            <MenuItem value=''>Tümü</MenuItem>
            <MenuItem value='in_stock'>Stokta Var</MenuItem>
            <MenuItem value='out_of_stock'>Stokta Yok</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 1.5 }} sx={{ display: 'flex', gap: 1 }}>
          <Button
            fullWidth
            variant='contained'
            size='medium'
            onClick={handleSearch}
          >
            Filtrele
          </Button>
          <Button
            fullWidth
            variant='outlined'
            color='secondary'
            size='medium'
            onClick={handleReset}
          >
            Temizle
          </Button>
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default TableFilters