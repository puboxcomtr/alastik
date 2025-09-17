'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'

// Third-party Imports
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'

// Component Imports
import Link from '@components/Link'
import CustomAvatar from '@core/components/mui/Avatar'

// Styled Component Imports
import AppReactDropzone from '@/libs/styles/AppReactDropzone'

import type { ProductType } from '@/types/apps/productTypes'

type FileProp = {
  name: string
  type: string
  size: number
}

interface ProductImageProps {
  product?: ProductType
}

// Styled Dropzone Component
const Dropzone = styled(AppReactDropzone)<BoxProps>(({ theme }) => ({
  '& .dropzone': {
    minHeight: 'unset',
    padding: theme.spacing(12),
    [theme.breakpoints.down('sm')]: {
      paddingInline: theme.spacing(5)
    },
    '&+.MuiList-root .MuiListItem-root .file-name': {
      fontWeight: theme.typography.body1.fontWeight
    }
  }
}))

const ProductImage = ({ product }: ProductImageProps) => {
  const [files, setFiles] = useState<File[]>([])
  const [diaImages, setDiaImages] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (product?.images && product.images.length > 0) {
      setDiaImages(product.images)
    } else if (product?.image) {
      setDiaImages([product.image])
    }
  }, [product])

  // Drag & Drop fonksiyonları
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

    // Sürüklenen öğeyi kaldır
    newImages.splice(draggedIndex, 1)
    // Yeni pozisyona ekle
    newImages.splice(dropIndex, 0, draggedImage)

    setDiaImages(newImages)
    setDraggedIndex(null)

    toast.success('Görsel sıralaması güncellendi.', {
      position: 'top-right'
    })
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // DIA görseli silme fonksiyonu
  const handleRemoveDiaImage = (imageUrl: string, index: number) => {
    toast.warn(
      <div>
        <p>Bu görseli silmek istediğinize emin misiniz?</p>
        <div className="flex gap-2 mt-3">
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => {
              const updatedImages = diaImages.filter((_, i) => i !== index)
              setDiaImages(updatedImages)
              toast.dismiss()
              toast.success('Görsel başarıyla kaldırıldı (geçici)', {
                position: 'top-right'
              })
            }}
          >
            Sil
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toast.dismiss()}
          >
            İptal
          </Button>
        </div>
      </div>,
      {
        position: 'top-right',
        autoClose: false,
        closeButton: false,
        draggable: false
      }
    )
  }

  // Hooks
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      setFiles(acceptedFiles.map((file: File) => Object.assign(file)))
    }
  })

  const renderFilePreview = (file: FileProp) => {
    if (file.type.startsWith('image')) {
      return <img width={38} height={38} alt={file.name} src={URL.createObjectURL(file as any)} />
    } else {
      return <i className='ri-file-text-line' />
    }
  }

  const handleRemoveFile = (file: FileProp) => {
    const uploadedFiles = files
    const filtered = uploadedFiles.filter((i: FileProp) => i.name !== file.name)
    setFiles([...filtered])
  }

  const fileList = files.map((file: FileProp) => (
    <ListItem key={file.name} className='px-4 py-3'>
      <div className='file-details'>
        <div className='file-preview'>{renderFilePreview(file)}</div>
        <div>
          <Typography className='file-name font-medium' color='text.primary'>
            {file.name}
          </Typography>
          <Typography className='file-size' variant='body2'>
            {Math.round(file.size / 100) / 10 > 1000
              ? `${(Math.round(file.size / 100) / 10000).toFixed(1)} mb`
              : `${(Math.round(file.size / 100) / 10).toFixed(1)} kb`}
          </Typography>
        </div>
      </div>
      <IconButton onClick={() => handleRemoveFile(file)}>
        <i className='ri-close-line text-xl' />
      </IconButton>
    </ListItem>
  ))

  const handleRemoveAllFiles = () => {
    setFiles([])
  }

  return (
    <Dropzone>
      <Card>
        <CardHeader
          title='Görsel Galerisi'
          sx={{ '& .MuiCardHeader-action': { alignSelf: 'center' } }}
        />
        <CardContent>
          <div {...getRootProps({ className: 'dropzone' })}>
            <input {...getInputProps()} />
            <div className='flex items-center flex-col gap-2 text-center'>
              <CustomAvatar variant='rounded' skin='light' color='secondary'>
                <i className='ri-upload-2-line' />
              </CustomAvatar>
              <Typography variant='h4'>Ürün görsellerini sürükle ve bu alana bırak</Typography>
              <Typography color='text.disabled'>veya</Typography>
              <Button variant='outlined' size='small'>
                Dosya Seçiniz
              </Button>
            </div>
          </div>
          {files.length ? (
            <>
              <List>{fileList}</List>
              <div className='buttons'>
                <Button color='error' variant='outlined' onClick={handleRemoveAllFiles}>
                  Temizle
                </Button>
                <Button variant='contained'>Yükle</Button>
              </div>
            </>
          ) : null}

          {diaImages.length > 0 && (
            <>
              <Box className="flex gap-2 mb-3 mt-3 overflow-x-auto">
                {diaImages.map((imageUrl, index) => (
                  <Box
                    key={`${imageUrl}-${index}`}
                    className="relative border-2 border-gray-300 rounded-lg overflow-hidden cursor-pointer select-none transition-all hover:shadow-lg"
                    sx={{
                      width: 120,
                      height: 120,
                      opacity: draggedIndex === index ? 0.5 : 1,
                      transform: draggedIndex === index ? 'scale(1.05)' : 'scale(1)',
                      '&:hover': {
                        borderColor: '#1976d2'
                      }
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <img
                      src={imageUrl}
                      alt={`DIA Görsel ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Sıra numarası */}
                    <Box
                      className="absolute top-1 left-1 bg-black bg-opacity-70 text-white rounded px-1"
                      sx={{ fontSize: '12px' }}
                    >
                      {index + 1}
                    </Box>

                    {/* Silme butonu */}
                    <IconButton
                      className="absolute top-1 right-1"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': {
                          backgroundColor: 'rgba(255,0,0,0.1)',
                          color: 'red'
                        },
                        width: 32,
                        height: 32
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveDiaImage(imageUrl, index)
                      }}
                    >
                      <i className='ri-close-line' style={{ fontSize: '20px' }} />
                    </IconButton>

                    {/* Drag handle */}
                    <Box
                      className="absolute bottom-1 right-1 text-white bg-black bg-opacity-50 rounded px-1"
                      sx={{ fontSize: '12px' }}
                    >
                      <i className='ri-drag-move-line' />
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Dropzone>
  )
}
export default ProductImage