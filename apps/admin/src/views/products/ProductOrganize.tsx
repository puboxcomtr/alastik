'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

// Types
interface ProductOrganizeProps {
  product?: {
    id: string | number
    category?: string
    properties?: Record<string, string>
    brand?: string
    readOnly?: boolean
  }
}

interface CategoryVariant {
  group: string
  value: string
}

const ProductOrganize = ({ product, readOnly = true }: ProductOrganizeProps) => {
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
      if (newVariants.length === 0) {
        newVariants.push({ group: '', value: '' })
      }
      setVariants(newVariants)
    } else if (!loading && variants.length === 0) {
      setVariants([{ group: '', value: '' }])
    }
  }, [product, categories, loading])


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
                      disabled={readOnly}
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
                        disabled={readOnly || !variant.group}
                      >
                        {variant.group && categories[variant.group]?.map(subCategory => (
                          <MenuItem key={subCategory} value={subCategory}>
                            {subCategory}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                </Grid>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductOrganize