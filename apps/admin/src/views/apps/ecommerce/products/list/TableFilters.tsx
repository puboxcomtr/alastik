'use client'
import { useState, useEffect } from 'react'

import Grid from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import Divider from '@mui/material/Divider'
import Autocomplete from '@mui/material/Autocomplete'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type FilterOptions = {
  brands: string[]
  productTypes: string[]
  seasons: string[]
  mainCategories: string[]
  widths: string[]
  profiles: string[]
  rims: string[]
  ozelkod1Values: string[]
  ozelkod2Values: string[]
  ozelkod3Values: string[]
  ozelkod4Values: string[]
  ozelkod5Values: string[]
  ozelkod6Values: string[]
  ozelkod7Values: string[]
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
  has_image: string
  has_description: string
  has_price: string
  has_ozelkod1: string
  has_ozelkod2: string
  has_ozelkod3: string
  has_ozelkod4: string
  has_ozelkod6: string
  has_ozelkod7: string
  has_ozelkod11: string
  ozelkod1: string
  ozelkod2: string
  ozelkod3: string
  ozelkod4: string
  ozelkod5: string
  ozelkod6: string
  ozelkod7: string
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
    stock_status: '',
    has_image: '',
    has_description: '',
    has_price: '',
    has_ozelkod1: '',
    has_ozelkod2: '',
    has_ozelkod3: '',
    has_ozelkod4: '',
    has_ozelkod6: '',
    has_ozelkod7: '',
    has_ozelkod11: '',
    ozelkod1: '',
    ozelkod2: '',
    ozelkod3: '',
    ozelkod4: '',
    ozelkod5: '',
    ozelkod6: '',
    ozelkod7: ''
  })

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brands: [],
    productTypes: [],
    seasons: [],
    mainCategories: [],
    widths: [],
    profiles: [],
    rims: [],
    ozelkod1Values: [],
    ozelkod2Values: [],
    ozelkod3Values: [],
    ozelkod4Values: [],
    ozelkod5Values: [],
    ozelkod6Values: [],
    ozelkod7Values: []
  })

  const [subCategories, setSubCategories] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [skuInput, setSkuInput] = useState('')

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

  const buildParams = (currentFilters: Filters, currentSku: string) => {
    const params: Record<string, string> = {}
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (key === 'sku') return
      if (value && value.trim() !== '') {
        params[key] = value.trim()
      }
    })
    if (currentSku.trim() !== '') {
      params.sku = currentSku.trim()
    }
    return params
  }

  const handleSearch = () => {
    onFilterChange(buildParams(filters, skuInput))
    setOpen(false)
  }

  const handleReset = () => {
    const empty: Filters = {
      search: '', sku: '', brand: '', product_type: '',
      season: '', main_category: '', sub_category: '',
      width: '', profile: '', rim: '', stock_status: '',
      has_image: '', has_description: '', has_price: '',
      has_ozelkod1: '', has_ozelkod2: '', has_ozelkod3: '',
      has_ozelkod4: '', has_ozelkod5: '', has_ozelkod6: '', has_ozelkod7: '',
      has_ozelkod11: '',
      ozelkod1: '', ozelkod2: '', ozelkod3: '', ozelkod4: '',
      ozelkod5: '', ozelkod6: '', ozelkod7: ''
    }
    setFilters(empty)
    setSubCategories([])
    setSkuInput('')
    onFilterChange({})
    setOpen(false)
  }

  const handleSkuKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onFilterChange(buildParams(filters, skuInput))
    }
  }

  const handlePopoverKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'sku' && value && value.trim() !== ''
  ).length

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 4 }}>
        <Badge badgeContent={activeFilterCount} color='primary'>
          <Button
            variant='outlined'
            color='secondary'
            startIcon={<i className='ri-filter-3-line' />}
            endIcon={<i className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
            onClick={() => setOpen(prev => !prev)}
            sx={{ minWidth: 140 }}
          >
            Filtreler
          </Button>
        </Badge>

        <TextField
          size='small'
          placeholder='Stok kodu ile arama yapabilirsiniz...'
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          onKeyDown={handleSkuKeyPress}
          sx={{ flex: 1, minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='ri-search-line' />
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Collapse in={open} timeout='auto' unmountOnExit>
        <Divider />
        <Box sx={{ p: 6 }}>
          <Grid container spacing={4} onKeyDown={handlePopoverKeyPress}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size='small'
                label='Ürün Adı'
                placeholder='Ürün adı ile ara...'
                value={filters.search}
                onChange={handleChange('search')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
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
            <Grid size={{ xs: 12, sm: 4 }}>
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
            <Grid size={{ xs: 12, sm: 4 }}>
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
            <Grid size={{ xs: 12, sm: 4 }}>
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
            <Grid size={{ xs: 12, sm: 4 }}>
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
            <Grid size={{ xs: 4 }}>
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
            <Grid size={{ xs: 4 }}>
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
            <Grid size={{ xs: 4 }}>
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
            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12 }}>
              <Divider textAlign='left' sx={{ mt: 2, mb: 1 }}>Özel Kod Değerleri</Divider>
            </Grid>

            <Grid size={{ xs: 6, sm: 4 }}>
              <Autocomplete
                size='small'
                options={filterOptions.ozelkod1Values}
                value={filters.ozelkod1 || null}
                onChange={(_, val) => setFilters(prev => ({ ...prev, ozelkod1: val || '' }))}
                renderInput={(params) => <TextField {...params} label='Mevsim' />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Autocomplete
                size='small'
                options={filterOptions.ozelkod2Values}
                value={filters.ozelkod2 || null}
                onChange={(_, val) => setFilters(prev => ({ ...prev, ozelkod2: val || '' }))}
                renderInput={(params) => <TextField {...params} label='Ürün Tipi (Kod)' />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Autocomplete
                size='small'
                options={filterOptions.ozelkod3Values}
                value={filters.ozelkod3 || null}
                onChange={(_, val) => setFilters(prev => ({ ...prev, ozelkod3: val || '' }))}
                renderInput={(params) => <TextField {...params} label='Ebat' />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Autocomplete
                size='small'
                options={filterOptions.ozelkod4Values}
                value={filters.ozelkod4 || null}
                onChange={(_, val) => setFilters(prev => ({ ...prev, ozelkod4: val || '' }))}
                renderInput={(params) => <TextField {...params} label='Jant Çapı' />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Autocomplete
                size='small'
                options={filterOptions.ozelkod5Values}
                value={filters.ozelkod5 || null}
                onChange={(_, val) => setFilters(prev => ({ ...prev, ozelkod5: val || '' }))}
                renderInput={(params) => <TextField {...params} label='Model' />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Autocomplete
                size='small'
                options={filterOptions.ozelkod6Values}
                value={filters.ozelkod6 || null}
                onChange={(_, val) => setFilters(prev => ({ ...prev, ozelkod6: val || '' }))}
                renderInput={(params) => <TextField {...params} label='Durum' />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Autocomplete
                size='small'
                options={filterOptions.ozelkod7Values}
                value={filters.ozelkod7 || null}
                onChange={(_, val) => setFilters(prev => ({ ...prev, ozelkod7: val || '' }))}
                renderInput={(params) => <TextField {...params} label='Ürün Tipi' />}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider textAlign='left' sx={{ mt: 2, mb: 1 }}>Eksik Veri Filtreleri</Divider>
            </Grid>

            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Görsel'
                value={filters.has_image}
                onChange={handleChange('has_image')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Açıklama'
                value={filters.has_description}
                onChange={handleChange('has_description')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Fiyat'
                value={filters.has_price}
                onChange={handleChange('has_price')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Mevsim Kodu'
                value={filters.has_ozelkod1}
                onChange={handleChange('has_ozelkod1')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Set Lastik Kodu'
                value={filters.has_ozelkod2}
                onChange={handleChange('has_ozelkod2')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Ebat Kodu'
                value={filters.has_ozelkod3}
                onChange={handleChange('has_ozelkod3')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Jant Çapı Kodu'
                value={filters.has_ozelkod4}
                onChange={handleChange('has_ozelkod4')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Durum Kodu'
                value={filters.has_ozelkod6}
                onChange={handleChange('has_ozelkod6')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Ürün Tipi Kodu'
                value={filters.has_ozelkod7}
                onChange={handleChange('has_ozelkod7')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Var</MenuItem>
                <MenuItem value='no'>Yok</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select fullWidth size='small'
                label='Yayında (E/H)'
                value={filters.has_ozelkod11}
                onChange={handleChange('has_ozelkod11')}
              >
                <MenuItem value=''>Tümü</MenuItem>
                <MenuItem value='yes'>Evet</MenuItem>
                <MenuItem value='no'>Hayır</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant='outlined'
                color='secondary'
                onClick={handleReset}
              >
                Temizle
              </Button>
              <Button
                variant='contained'
                onClick={handleSearch}
              >
                Filtrele
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  )
}

export default TableFilters