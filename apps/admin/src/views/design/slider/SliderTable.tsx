'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import tableStyles from '@core/styles/table.module.css'
import { toast } from 'react-toastify'
import { fetchSliders, deleteSlider, type SliderType } from '@/utils/api/sliders'

// Helper: Görsel URL oluştur
const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return '/images/slider/gorsel-bulunamadi.jpg'
  if (url.startsWith('http')) return url

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3082'
  return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`
}

// Helper: Key'i panoya kopyala
const copyKeyToClipboard = (key: string) => {
  const template = `{{slider:${key}}}`
  navigator.clipboard.writeText(template)
  toast.success(`Kopyalandı: ${template}`)
}

const columnHelper = createColumnHelper<SliderType>()

const SliderTable = () => {
  const router = useRouter()
  const [data, setData] = useState<SliderType[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [sliderToDelete, setSliderToDelete] = useState<SliderType | null>(null)

  const loadSliders = async () => {
    try {
      setLoading(true)
      const result = await fetchSliders()
      if (result.success) {
        setData(result.data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Sliderlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSliders()
  }, [])

  const handleDeleteClick = (slider: SliderType) => {
    setSliderToDelete(slider)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setSliderToDelete(null)
  }

  const handleDeleteConfirm = async () => {
    if (!sliderToDelete) return

    try {
      const result = await deleteSlider(sliderToDelete._id)
      if (result.success) {
        toast.success('Slider başarıyla silindi')
        loadSliders()
      }
    } catch (error: any) {
      toast.error(error.message || 'Slider silinemedi')
    } finally {
      setDeleteConfirmOpen(false)
      setSliderToDelete(null)
    }
  }

  const columns = [
    columnHelper.accessor('_id', {
      header: 'ID',
      cell: ({ row }) => <Typography variant='body2'>#{row.index + 1}</Typography>
    }),
    columnHelper.accessor('sliders', {
      id: 'image-preview',
      header: 'Önizleme',
      cell: ({ row }) => {
        const firstImage = row.original.sliders[0]?.image
        return firstImage ? (
          <img
            src={getImageUrl(firstImage)}
            alt='Slider'
            className='w-20 h-12 object-cover rounded'
          />
        ) : (
          <div className='w-20 h-12 bg-gray-100 rounded flex items-center justify-center'>
            <i className='ri-image-line text-2xl text-gray-400' />
          </div>
        )
      }
    }),
    columnHelper.accessor('name', {
      header: 'Slider Adı',
      cell: ({ row }) => <Typography className='font-medium'>{row.original.name}</Typography>
    }),
    columnHelper.accessor('key', {
      header: 'Değişken (Key)',
      cell: ({ row }) => {
        const key = row.original.key
        if (!key) {
          return <Typography variant='body2' color='textSecondary'>-</Typography>
        }
        return (
          <Tooltip title="Kopyala">
            <Chip
              label={key}
              size='small'
              variant='outlined'
              color='primary'
              onClick={() => copyKeyToClipboard(key)}
              onDelete={() => copyKeyToClipboard(key)}
              deleteIcon={<i className='ri-file-copy-line' style={{ fontSize: '14px' }} />}
              sx={{ cursor: 'pointer', fontFamily: 'monospace' }}
            />
          </Tooltip>
        )
      }
    }),
    columnHelper.accessor('sliders', {
      id: 'slider-count',
      header: 'Görsel',
      cell: ({ row }) => (
        <Chip
          label={`${row.original.sliders.length}`}
          size='small'
          variant='outlined'
        />
      )
    }),
    columnHelper.accessor('settings', {
      header: 'Durum',
      cell: ({ row }) => (
        <Chip
          label={row.original.settings?.isActive ? 'Aktif' : 'Pasif'}
          color={row.original.settings?.isActive ? 'success' : 'default'}
          size='small'
        />
      )
    }),
    columnHelper.accessor('createdAt', {
      header: 'Eklenme',
      cell: ({ row }) => (
        <Typography variant='body2'>
          {new Date(row.original.createdAt).toLocaleDateString('tr-TR')}
        </Typography>
      )
    }),
    columnHelper.display({
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className='flex gap-2'>
          <Tooltip title="Düzenle">
            <IconButton
              size='small'
              onClick={() => router.push(`/tr/apps/design/slider/edit/${row.original._id}`)}
            >
              <i className='ri-edit-box-line text-textSecondary' />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sil">
            <IconButton
              size='small'
              onClick={() => handleDeleteClick(row.original)}
            >
              <i className='ri-delete-bin-line text-textSecondary' />
            </IconButton>
          </Tooltip>
        </div>
      )
    })
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  if (loading) {
    return (
      <Card>
        <CardHeader title='Slider Listesi' />
        <div className='p-6 text-center'>
          <Typography>Yükleniyor...</Typography>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader
          title='Slider Listesi'
          className='pbe-4'
          action={
            <Button
              color='primary'
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => router.push('/tr/apps/design/slider/add')}
            >
              Yeni Slider Ekle
            </Button>
          }
        />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='text-center p-6'>
                    <Typography>Henüz slider eklenmemiş</Typography>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Slider'ı Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>"{sliderToDelete?.name}"</strong> slider'ını silmek istediğinizden emin misiniz?
            {sliderToDelete && sliderToDelete.sliders.length > 0 && (
              <span style={{ display: 'block', marginTop: '8px', color: '#f44336' }}>
                Bu slider içinde {sliderToDelete.sliders.length} görsel bulunuyor.
              </span>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color='secondary'>
            İptal
          </Button>
          <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default SliderTable