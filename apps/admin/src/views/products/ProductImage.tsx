'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  IconButton,
  Typography,
  Box,
  Link
} from '@mui/material'

// Third-party Imports
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Component Imports
import MediaLibrary from '@/components/MediaLibrary/MediaLibrary'

// Type Imports
import type { ProductImageProps } from '@/types/apps/productTypes'
import type { MediaFile } from '@/types/apps/mediaTypes'

// ============================================
// MAIN COMPONENT
// ============================================
const ProductImage = ({ product }: ProductImageProps) => {
  // States
  const [diaImages, setDiaImages] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)

  // Initialize images from product
  useEffect(() => {
    if (product?.images && product.images.length > 0) {
      setDiaImages(product.images)
    } else if (product?.image) {
      setDiaImages([product.image])
    }
  }, [product])

  // ============================================
  // HANDLERS
  // ============================================

  // Media Library'den seçilen görselleri işle
  const handleMediaSelect = (selectedFiles: MediaFile[]) => {
    const selectedUrls = selectedFiles.map(file => file.url)
    setDiaImages(prev => [...prev, ...selectedUrls])

    toast.success(`${selectedFiles.length} görsel eklendi`)
    updateProductSynchronization('N')
  }

  // Ürün senkronizasyonunu güncelle
  const updateProductSynchronization = async (syncValue: 'Y' | 'N') => {
    if (!product?.id) return

    try {
      await fetchAPI(API_ENDPOINTS.products.sync(product.id), {
        method: 'PATCH',
        body: JSON.stringify({ synchronization: syncValue })
      })

      console.log(`Synchronization updated to ${syncValue}`)
    } catch (error) {
      console.error('Synchronization update error:', error)
      toast.error('Senkronizasyon güncellenemedi')
    }
  }
  const saveImageOrder = async (images: string[]) => {
    if (!product?.id) return
    try {
      const customImages = images.map((url, index) => ({
        order: index,
        url: url,
        alt: '',
        title: ''
      }))

      await fetchAPI(API_ENDPOINTS.products.update(product.id), {
        method: 'PATCH',
        body: JSON.stringify({ customImages })
      })
      toast.success('Görsel sıralaması kaydedildi')
    } catch (error) {
      console.error('Image order save error:', error)
      toast.error('Görsel sıralaması kaydedilemedi')
    }
  }

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return
    const newImages = [...diaImages]
    const draggedImage = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, draggedImage)
    setDiaImages(newImages)
    setDraggedIndex(null)
    await saveImageOrder(newImages)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Görsel silme
  const handleRemoveImage = (imageUrl: string, index: number) => {
    const updatedImages = diaImages.filter((_, i) => i !== index)
    setDiaImages(updatedImages)
    toast.success('Görsel kaldırıldı')
    updateProductSynchronization('N')
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <Card>
        <CardHeader
          title='Ürün Görselleri'
          action={
            <Button
              variant="contained"
              onClick={() => setMediaLibraryOpen(true)}
              startIcon={<i className='ri-image-add-line' />}
            >
              Görsel Ekle
            </Button>
          }
        />
        <CardContent>
          {/* Mevcut Görseller */}
          {diaImages.length > 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Görselleri sürükleyerek sıralayabilirsiniz
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {diaImages.map((imageUrl, index) => (
                  <Box
                    key={`${imageUrl}-${index}`}
                    sx={{
                      position: 'relative',
                      width: 150,
                      height: 150,
                      border: '2px solid',
                      borderColor: draggedIndex === index ? 'primary.main' : 'grey.300',
                      borderRadius: 2,
                      overflow: 'hidden',
                      cursor: 'grab',
                      opacity: draggedIndex === index ? 0.5 : 1,
                      transform: draggedIndex === index ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2
                      },
                      '&:active': {
                        cursor: 'grabbing'
                      }
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <img
                      src={imageUrl.includes('/api/proxy-image')
                        ? imageUrl
                        : `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
                      }
                      alt={`Ürün Görseli ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none'
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/images/placeholder-image.png'
                      }}
                    />

                    {/* Silme butonu */}
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'error.main',
                        color: 'white',
                        width: 24,
                        height: 24,
                        '&:hover': {
                          backgroundColor: 'error.dark'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage(imageUrl, index)
                      }}
                    >
                      <i className='ri-close-line' />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Link>
                <i className='ri-image-line' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Henüz ürün görseli eklenmemiş
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  "Görsel Ekle" butonuna tıklayarak görsel ekleyebilirsiniz
                </Typography>
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Media Library Modal */}
      <MediaLibrary
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        multiple={true}
        folder="urun"
        title="Ürün Görseli Seç"
        maxFileSize={10 * 1024 * 1024}
      />
    </>
  )
}

export default ProductImage