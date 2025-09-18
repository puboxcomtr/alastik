'use client'

// React Imports
import { useState, useEffect } from 'react'

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

// Types
interface ProductOrganizeProps {
  product?: {
    id: string | number
    category?: string
    properties?: Record<string, string>
    brand?: string
  }
}

interface CategoryVariant {
  group: string
  value: string
}

const ProductOrganize = ({ product }: ProductOrganizeProps) => {
  const [variants, setVariants] = useState<CategoryVariant[]>([])
  const [categories, setCategories] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082'
        const apiUrl = baseUrl.endsWith('/api') ? `${baseUrl}/categories` : `${baseUrl}/api/categories`
        const response = await fetch(apiUrl)

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const categoriesMap: Record<string, string[]> = {}
            result.data.forEach((category: any) => {
              categoriesMap[category._id] = category.subCategories || []
            })
            setCategories(categoriesMap)
          } else {
            throw new Error('API response format hatası')
          }
        } else {
          throw new Error(`API hatası: ${response.status}`)
        }
      } catch (error) {
        setCategories({
          'Lastik': ['Set Lastikler', 'Ticari Lastik', 'Yaz Lastikleri', 'Oto Lastik', '4x4 Lastik'],
          'Jant': ['Oto Jant', '4x4 Jant', 'Ticari Jant'],
          'Akü': ['Oto Akü']
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    if (product && !loading && Object.keys(categories).length > 0) {
      let newVariants: CategoryVariant[] = []

      if (product.properties?.m_kategoriler && Array.isArray(product.properties.m_kategoriler)) {
        product.properties.m_kategoriler.forEach((kategori: any, index: number) => {
          if (kategori.kategori_aciklama_1) {
            const mainCategory = kategori.kategori_aciklama_1
            const subCategory = kategori.kategori_aciklama_2 || kategori.kategori_aciklama_3 || ''

            if (categories[mainCategory]) {
              const availableSubCategories = categories[mainCategory] || []
              let matchedSubCategory = ''

              if (subCategory) {
                matchedSubCategory = availableSubCategories.find(sub =>
                  sub === subCategory ||
                  sub.toLowerCase().includes(subCategory.toLowerCase()) ||
                  subCategory.toLowerCase().includes(sub.toLowerCase())
                ) || ''
              }

              newVariants.push({
                group: mainCategory,
                value: matchedSubCategory
              })
            }
          }
        })
      }

      else if (product.category) {
        const existingCategory = product.category
        const mainCategories = Object.keys(categories)

        let matchedMainCategory = mainCategories.find(cat => cat === existingCategory)

        if (!matchedMainCategory) {
          matchedMainCategory = mainCategories.find(cat =>
            cat.toLowerCase().includes(existingCategory.toLowerCase()) ||
            existingCategory.toLowerCase().includes(cat.toLowerCase())
          )
        }

        if (matchedMainCategory) {
          const subCategories = categories[matchedMainCategory] || []
          let matchedSubCategory = subCategories.find(sub => sub === existingCategory)

          if (!matchedSubCategory && subCategories.length > 0) {
            matchedSubCategory = subCategories.find(sub =>
              sub.toLowerCase().includes(existingCategory.toLowerCase()) ||
              existingCategory.toLowerCase().includes(sub.toLowerCase())
            ) || ''
          }

          newVariants.push({
            group: matchedMainCategory,
            value: matchedSubCategory || ''
          })
        }
      }

      console.log('Çoklu kategori eşleştirmesi:', {
        productData: {
          category: product.category,
          allProperties: Object.keys(product.properties || {}),
          m_kategoriler: product.properties?.m_kategoriler?.map((k: any) => ({
            kategori_1: k.kategori_aciklama_1,
            kategori_2: k.kategori_aciklama_2,
            kategori_3: k.kategori_aciklama_3
          })),
          direct_m_kategoriler: (product as any).m_kategoriler?.map((k: any) => ({
            kategori_1: k.kategori_aciklama_1,
            kategori_2: k.kategori_aciklama_2,
            kategori_3: k.kategori_aciklama_3
          }))
        },
        matchedVariants: newVariants,
        availableCategories: Object.keys(categories)
      })
      if (newVariants.length === 0) {
        newVariants.push({ group: '', value: '' })
      }

      setVariants(newVariants)
    } else if (!loading && variants.length === 0) {
      setVariants([{ group: '', value: '' }])
    }
  }, [product, categories, loading])

  const handleGroupChange = (index: number, newGroup: string) => {
    const updated = [...variants]
    updated[index] = { group: newGroup, value: '' }
    setVariants(updated)
  }

  const handleValueChange = (index: number, newValue: string) => {
    const updated = [...variants]
    updated[index].value = newValue
    setVariants(updated)
  }

  const addVariant = () => {
    setVariants([...variants, { group: '', value: '' }])
  }

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      const updated = [...variants]
      updated.splice(index, 1)
      setVariants(updated)
    }
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
                      label='Ana Kategori'
                      value={variant.group}
                      onChange={e => handleGroupChange(index, e.target.value)}
                    >
                      {Object.keys(categories).map(category => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <div className='flex items-center gap-5'>
                    <FormControl fullWidth>
                      <InputLabel>Alt Kategori</InputLabel>
                      <Select
                        value={variant.value}
                        label='Alt Kategori'
                        onChange={e => handleValueChange(index, e.target.value)}
                        disabled={!variant.group}
                      >
                        {variant.group && categories[variant.group]?.map(subCategory => (
                          <MenuItem key={subCategory} value={subCategory}>
                            {subCategory}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {variants.length > 1 && (
                      <CustomIconButton
                        onClick={() => removeVariant(index)}
                        className='min-is-fit'
                      >
                        <i className='ri-close-line' />
                      </CustomIconButton>
                    )}
                  </div>
                </Grid>
              </Grid>
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <Button
              variant='contained'
              onClick={addVariant}
              startIcon={<i className='ri-add-line' />}
            >
              Kategori Ekle
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductOrganize