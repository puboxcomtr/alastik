'use client'

import { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import { toast } from 'react-toastify'
import type { DiaAktarimSettings, DiaZorunluDahilSettings, DiaAktarimMode, DiaAktarimFilterType, DiaAktarimProduct, DiaAktarimNamedItem } from '@/types/apps/diaTypes'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Aktarım (ürün filtreleme) ayarları — değerler parent'ın settings state'inde tutulur,
// "Ayarları Kaydet" ile site bazlı kaydedilir.
type SearchResult = DiaAktarimProduct & { qty: number }

interface Props {
  value: DiaAktarimSettings | DiaZorunluDahilSettings
  onChange: (value: any) => void
  // "Her Zaman Dahil" kartında mod seçici gizlenir; liste her zaman dahil etme anlamındadır
  hideMode?: boolean
  title?: string
  selectionHint?: string
}

export default function TransferSettingsCard({ value, onChange, hideMode = false, title, selectionHint }: Props) {
  // Ürün arama (yalnızca görüntüleme amaçlı yerel state)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  // Kategori / marka listeleri
  const [categories, setCategories] = useState<DiaAktarimNamedItem[]>([])
  const [brands, setBrands] = useState<DiaAktarimNamedItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listFilter, setListFilter] = useState('')

  const filterType = value.filterType
  const mode: DiaAktarimMode = hideMode ? 'dahil' : (value as DiaAktarimSettings).mode
  const selectedProducts = value.products || []
  const selectedCategories = value.categories || []
  const selectedBrands = value.brands || []

  useEffect(() => {
    if (mode === 'tumu') return
    if (filterType === 'kategori' && categories.length === 0) loadList('kategori')
    if (filterType === 'marka' && brands.length === 0) loadList('marka')
  }, [mode, filterType])

  const update = (patch: Partial<DiaAktarimSettings> | Partial<DiaZorunluDahilSettings>) => {
    onChange({ ...value, ...patch })
  }

  const loadList = async (type: 'kategori' | 'marka') => {
    try {
      setListLoading(true)
      const url = type === 'kategori' ? API_ENDPOINTS.diaSettings.aktarimCategories() : API_ENDPOINTS.diaSettings.aktarimBrands()
      const res = await fetchAPI(url)
      const rows = (res.data || []) as any[]
      const items: DiaAktarimNamedItem[] = rows
        .map(r => ({ id: String(r.id || ''), name: r.name || '' }))
        .filter(r => r.id && r.name)

      if (type === 'kategori') setCategories(items)
      else setBrands(items)
    } catch {
      toast.error(type === 'kategori' ? 'Kategoriler yüklenemedi' : 'Markalar yüklenemedi')
    } finally {
      setListLoading(false)
    }
  }

  const handleProductSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Lütfen arama terimi girin')
      return
    }

    setIsSearching(true)
    setSearchPerformed(true)

    try {
      const res = await fetchAPI(API_ENDPOINTS.diaSettings.aktarimProducts(searchQuery.trim()))
      const rows = (res.data || []) as any[]
      setSearchResults(rows.map(p => ({
        id: String(p.id || ''),
        name: p.name || '',
        sku: p.sku || '',
        brand: p.brand || '',
        qty: p.qty ?? 0
      })))

      if (rows.length === 0) toast.info('Arama sonucu bulunamadı')
    } catch {
      toast.error('Ürün araması yapılırken hata oluştu')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const isProductSelected = (id: string) => selectedProducts.some(p => p.id === id)

  const toggleProduct = (product: SearchResult | DiaAktarimProduct) => {
    const item: DiaAktarimProduct = { id: product.id, name: product.name, sku: product.sku, brand: product.brand }
    const next = selectedProducts.some(p => p.id === item.id)
      ? selectedProducts.filter(p => p.id !== item.id)
      : [...selectedProducts, item]
    update({ products: next })
  }

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      const news = searchResults
        .filter(r => !selectedProducts.some(p => p.id === r.id))
        .map(r => ({ id: r.id, name: r.name, sku: r.sku, brand: r.brand }))
      update({ products: [...selectedProducts, ...news] })
    } else {
      const ids = searchResults.map(r => r.id)
      update({ products: selectedProducts.filter(p => !ids.includes(p.id)) })
    }
  }

  const toggleNamed = (item: DiaAktarimNamedItem, type: 'kategori' | 'marka') => {
    const current = type === 'kategori' ? selectedCategories : selectedBrands
    const next = current.some(p => p.id === item.id)
      ? current.filter(p => p.id !== item.id)
      : [...current, item]
    update(type === 'kategori' ? { categories: next } : { brands: next })
  }

  const selectedCount = filterType === 'urun'
    ? selectedProducts.length
    : filterType === 'kategori' ? selectedCategories.length : selectedBrands.length

  const namedList = filterType === 'kategori' ? categories : brands
  const namedSelected = filterType === 'kategori' ? selectedCategories : selectedBrands
  const filteredNamedList = listFilter.trim()
    ? namedList.filter(i => i.name.toLowerCase().includes(listFilter.trim().toLowerCase()))
    : namedList

  return (
    <Card>
      <CardHeader
        title={title || 'Aktarım Ayarları'}
        subheader={selectionHint || "DİA'dan aktarılan ürünlerin sitede gösterim filtresi"}
      />
      <CardContent>
        <Grid container spacing={5}>
          {!hideMode && (
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="aktarim-modu-label">Aktarım Modu</InputLabel>
                <Select
                  labelId="aktarim-modu-label"
                  label="Aktarım Modu"
                  value={mode}
                  onChange={e => update({ mode: e.target.value as DiaAktarimMode })}
                >
                  <MenuItem value="tumu">Tüm Ürünler</MenuItem>
                  <MenuItem value="dahil">Seçilenleri Dahil Et</MenuItem>
                  <MenuItem value="haric">Seçilenleri Hariç Bırak</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          {mode !== 'tumu' && (
            <>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="filtre-turu-label">Filtre Türü</InputLabel>
                  <Select
                    labelId="filtre-turu-label"
                    label="Filtre Türü"
                    value={filterType}
                    onChange={e => {
                      update({ filterType: e.target.value as DiaAktarimFilterType })
                      setListFilter('')
                    }}
                  >
                    <MenuItem value="urun">Belirli Ürünlere Özel</MenuItem>
                    <MenuItem value="kategori">Belirli Kategorilere Özel</MenuItem>
                    <MenuItem value="marka">Belirli Markalara Özel</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {filterType === 'urun' ? 'Ürün Seçimi' : filterType === 'kategori' ? 'Kategori Seçimi' : 'Marka Seçimi'} ({selectedCount} seçili)
                  {' — '}
                  {hideMode
                    ? 'ürün, kategori ve marka listelerinin tamamı birlikte geçerlidir; DİA\'da pasif olan kartlar yine aktarılmaz.'
                    : mode === 'dahil'
                      ? 'seçilenler, filtre kurallarına takılsa bile sitede gösterilir.'
                      : 'seçilenler sitede gösterilmez.'}
                </Typography>
              </Grid>

              {filterType === 'urun' ? (
                <>
                  {/* Seçili ürünler */}
                  {selectedProducts.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" className="mb-2" color="text.secondary">
                        Seçili Ürünler
                      </Typography>
                      <div className="overflow-x-auto" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                              <th style={{ padding: '10px 8px', textAlign: 'left' }}>Ürün Adı</th>
                              <th style={{ padding: '10px 8px', textAlign: 'left' }}>Stok Kodu</th>
                              <th style={{ padding: '10px 8px', textAlign: 'left' }}>Marka</th>
                              <th style={{ padding: '10px 8px', textAlign: 'center', width: '70px' }}>İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedProducts.map(product => (
                              <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '10px 8px' }}>
                                  <Typography variant="body2">{product.name}</Typography>
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                  <Typography variant="body2" color="text.secondary">{product.sku}</Typography>
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                  <Typography variant="body2">{product.brand}</Typography>
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                  <Tooltip title="Çıkar">
                                    <IconButton size="small" color="error" onClick={() => toggleProduct(product)}>
                                      <i className="ri-close-line" />
                                    </IconButton>
                                  </Tooltip>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Grid>
                  )}

                  {/* Ürün arama */}
                  <Grid size={{ xs: 12, md: 9 }}>
                    <TextField
                      fullWidth
                      placeholder="Ürün adı, stok kodu ile ara..."
                      size="small"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleProductSearch()
                        }
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <i className="ri-search-line" />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Button fullWidth variant="outlined" onClick={handleProductSearch} disabled={isSearching}>
                      {isSearching ? 'Aranıyor...' : 'Ara'}
                    </Button>
                  </Grid>

                  {/* Arama sonuçları */}
                  <Grid size={{ xs: 12 }}>
                    <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <th style={{ padding: '10px 8px', textAlign: 'left', width: '40px' }}>
                              <Checkbox
                                size="small"
                                checked={searchResults.length > 0 && searchResults.every(p => isProductSelected(p.id))}
                                indeterminate={searchResults.some(p => isProductSelected(p.id)) && !searchResults.every(p => isProductSelected(p.id))}
                                onChange={e => handleSelectAllProducts(e.target.checked)}
                              />
                            </th>
                            <th style={{ padding: '10px 8px', textAlign: 'left' }}>Ürün Adı</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left' }}>Stok Kodu</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left' }}>Marka</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right' }}>Stok</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!searchPerformed ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '32px 8px', textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Ürün aramak için yukarıdaki arama kutusunu kullanın
                                </Typography>
                              </td>
                            </tr>
                          ) : isSearching ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '32px 8px', textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Ürünler aranıyor...</Typography>
                              </td>
                            </tr>
                          ) : searchResults.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '32px 8px', textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Arama sonucu bulunamadı</Typography>
                              </td>
                            </tr>
                          ) : (
                            searchResults.map(product => (
                              <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '10px 8px' }}>
                                  <Checkbox
                                    size="small"
                                    checked={isProductSelected(product.id)}
                                    onChange={() => toggleProduct(product)}
                                  />
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                  <Typography variant="body2">{product.name}</Typography>
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                  <Typography variant="body2" color="text.secondary">{product.sku}</Typography>
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                  <Typography variant="body2">{product.brand}</Typography>
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                  <Typography variant="body2" color={product.qty > 0 ? 'success.main' : 'error.main'}>
                                    {product.qty}
                                  </Typography>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Grid>
                </>
              ) : (
                <>
                  {/* Kategori / Marka seçimi */}
                  {namedSelected.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {namedSelected.map(item => (
                          <Chip
                            key={item.id}
                            label={item.name}
                            size="small"
                            color="primary"
                            onDelete={() => toggleNamed(item, filterType as 'kategori' | 'marka')}
                          />
                        ))}
                      </div>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={filterType === 'kategori' ? 'Kategori ara...' : 'Marka ara...'}
                      value={listFilter}
                      onChange={e => setListFilter(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <i className="ri-search-line" />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <div className="overflow-x-auto" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {listLoading ? (
                            <tr>
                              <td style={{ padding: '32px 8px', textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Yükleniyor...</Typography>
                              </td>
                            </tr>
                          ) : filteredNamedList.length === 0 ? (
                            <tr>
                              <td style={{ padding: '32px 8px', textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  {filterType === 'kategori' ? 'Kategori bulunamadı' : 'Marka bulunamadı'}
                                </Typography>
                              </td>
                            </tr>
                          ) : (
                            filteredNamedList.map(item => (
                              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '6px 8px', width: '40px' }}>
                                  <Checkbox
                                    size="small"
                                    checked={namedSelected.some(s => s.id === item.id)}
                                    onChange={() => toggleNamed(item, filterType as 'kategori' | 'marka')}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <Typography variant="body2">{item.name}</Typography>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Grid>
                </>
              )}
            </>
          )}
        </Grid>
      </CardContent>
    </Card>
  )
}
