'use client'

import { useState, useEffect } from 'react'

import {
  Card,
  CardHeader,
  CardContent,
  Button,
  IconButton,
  Typography,
  Box,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack
} from '@mui/material'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import MediaLibrary from '@/components/MediaLibrary/MediaLibrary'

import type { ProductImageProps } from '@/types/apps/productTypes'
import type { MediaFile } from '@/types/apps/mediaTypes'

type ProductVideo = {
  order?: number
  url: string
  videoId: string
  title?: string
}

const extractYoutubeId = (rawUrl: string): string | null => {
  const url = String(rawUrl || '').trim()

  if (!url) return null

  const patterns = [
    /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/shorts\/([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/embed\/([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/live\/([A-Za-z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)

    if (match) return match[1]
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url

  return null
}

const ProductImage = ({ product }: ProductImageProps) => {
  const [diaImages, setDiaImages] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [videos, setVideos] = useState<ProductVideo[]>([])
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')

  useEffect(() => {
    if (product?.images && product.images.length > 0) {
      setDiaImages(product.images)
    } else if (product?.image) {
      setDiaImages([product.image])
    }
  }, [product])

  useEffect(() => {
    setVideos((product as any)?.videos || [])
  }, [product])

  const handleMediaSelect = (selectedFiles: MediaFile[]) => {
    const selectedUrls = selectedFiles.map(file => file.url)
    setDiaImages(prev => [...prev, ...selectedUrls])

    toast.success(`${selectedFiles.length} görsel eklendi`)
    updateProductSynchronization('N')
  }

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

  const saveVideos = async (nextVideos: ProductVideo[]) => {
    if (!product?.id) return

    try {
      await fetchAPI(API_ENDPOINTS.products.update(product.id), {
        method: 'PATCH',
        body: JSON.stringify({ videos: nextVideos })
      })

      return true
    } catch (error) {
      console.error('Video kaydetme hatası:', error)
      toast.error('Video kaydedilemedi')

      return false
    }
  }

  const handleAddVideo = async () => {
    const videoId = extractYoutubeId(videoUrl)

    if (!videoId) {
      toast.error('Geçerli bir YouTube adresi girin')

      return
    }

    if (videos.some(video => video.videoId === videoId)) {
      toast.error('Bu video zaten eklenmiş')

      return
    }

    const nextVideos = [...videos, { order: videos.length, url: videoUrl.trim(), videoId, title: videoTitle.trim() }]

    const saved = await saveVideos(nextVideos)

    if (!saved) return

    setVideos(nextVideos)
    setVideoUrl('')
    setVideoTitle('')
    setVideoDialogOpen(false)
    toast.success('Video eklendi')
  }

  const handleRemoveVideo = async (index: number) => {
    const nextVideos = videos
      .filter((_, i) => i !== index)
      .map((video, i) => ({ ...video, order: i }))

    const saved = await saveVideos(nextVideos)

    if (!saved) return

    setVideos(nextVideos)
    toast.success('Video kaldırıldı')
  }

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
            <Stack direction='row' spacing={2}>
              <Button
                variant="contained"
                onClick={() => setMediaLibraryOpen(true)}
                startIcon={<i className='ri-image-add-line' />}
              >
                Görsel Ekle
              </Button>
              <Button
                variant="outlined"
                onClick={() => setVideoDialogOpen(true)}
                startIcon={<i className='ri-youtube-line' />}
              >
                Video Ekle
              </Button>
            </Stack>
          }
        />
        <CardContent>
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

          {videos.length > 0 && (
            <Box sx={{ mt: 5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ürün videoları
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {videos.map((video, index) => (
                  <Box
                    key={video.videoId}
                    sx={{
                      position: 'relative',
                      width: 200,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <a href={video.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt={video.title || 'Ürün videosu'}
                        style={{ width: '100%', display: 'block' }}
                      />
                    </a>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" noWrap>
                        {video.title || video.videoId}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveVideo(index)}
                      aria-label="Videoyu kaldır"
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'error.main', color: 'common.white' }
                      }}
                    >
                      <i className='ri-close-line' />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={videoDialogOpen} onClose={() => setVideoDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>YouTube Videosu Ekle</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              autoFocus
              label="YouTube Adresi"
              placeholder="https://www.youtube.com/watch?v=... veya .../shorts/..."
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              helperText="Normal video, short ve canlı yayın adresleri desteklenir"
            />
            <TextField
              fullWidth
              label="Başlık (isteğe bağlı)"
              placeholder="Ürün tanıtım videosu"
              value={videoTitle}
              onChange={e => setVideoTitle(e.target.value)}
            />
            {extractYoutubeId(videoUrl) && (
              <Box sx={{ textAlign: 'center' }}>
                <img
                  src={`https://i.ytimg.com/vi/${extractYoutubeId(videoUrl)}/mqdefault.jpg`}
                  alt="Video önizleme"
                  style={{ maxWidth: '100%', borderRadius: 4 }}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVideoDialogOpen(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={handleAddVideo} disabled={!extractYoutubeId(videoUrl)}>
            Ekle
          </Button>
        </DialogActions>
      </Dialog>

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