'use client'
import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  IconButton,
  Typography,
  Box
} from '@mui/material'
import { toast } from 'react-toastify'
import MediaLibrary from '@/components/MediaLibrary/MediaLibrary'
import type { ProductType } from '@/types/apps/productTypes'

interface ProductImageProps {
  product?: ProductType
}

interface MediaFile {
  id: string
  filename: string
  url: string
  size: number
  uploadDate: string
  folder: string
}

const ProductImage = ({ product }: ProductImageProps) => {
  const [diaImages, setDiaImages] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)

  useEffect(() => {
    if (product?.images && product.images.length > 0) {
      setDiaImages(product.images)
    } else if (product?.image) {
      setDiaImages([product.image])
    }
  }, [product])

  // Media Library'den seçilen görselleri işle
  const handleMediaSelect = (selectedFiles: MediaFile[]) => {
    const selectedUrls = selectedFiles.map(file => file.url)
    setDiaImages(prev => [...prev, ...selectedUrls])

    toast.success(`${selectedFiles.length} görsel eklendi`)

    updateProductSynchronization('N')
  }

  const updateProductSynchronization = async (syncValue: 'Y' | 'N') => {
    if (!product?._key) return

    try {
      const response = await fetch(`http://localhost:3082/api/products/${product._key}/synchronization`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ synchronization: syncValue })
      })

      if (response.ok) {
        console.log(`Synchronization updated to ${syncValue}`)
      }
    } catch (error) {
      console.error('Synchronization update error:', error)
    }
  }

  // Sıralama için Drag & Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newImages = [...diaImages]
    const draggedImage = newImages[draggedIndex]

    newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, draggedImage)

    setDiaImages(newImages)
    setDraggedIndex(null)

    toast.success('Görsel sıralaması güncellendi')
    updateProductSynchronization('N')
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
                      <i className='ri-close-line'  />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <i className='ri-image-line' style={{ fontSize: 64, color: '#ccc' }} />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Henüz ürün görseli eklenmemiş
              </Typography>
              <Typography variant="body2" color="text.secondary">
                "Görsel Ekle" butonuna tıklayarak görsel ekleyebilirsiniz
              </Typography>
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
        maxFileSize={10 * 1024 * 1024} // 10MB
      />
    </>
  )
}

export default ProductImage