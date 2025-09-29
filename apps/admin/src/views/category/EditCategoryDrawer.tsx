'use client'

// React Imports
import { useEffect, useState, useRef } from 'react'
import type { ChangeEvent } from 'react'

// Type Imports
import type { CategoryType } from '@/types/apps/productTypes'


// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'

// Third-party Imports
import { useForm, Controller } from 'react-hook-form'


type Props = {
  open: boolean
  handleClose: () => void
  categoryData: CategoryType[]
  selectedCategory: CategoryType | null
  setData: (data: CategoryType[]) => void
}

type FormValues = {
  name: string
  diaCategory: string
  seoTitle: string
  seoUrl: string
  webOrder: number
}

const EditCategoryDrawer = ({ open, handleClose, categoryData, selectedCategory, setData }: Props) => {
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      diaCategory: '',
      seoTitle: '',
      seoUrl: '',
      webOrder: 0
    }
  })
  useEffect(() => {
    if (selectedCategory) {
      reset({
        name: selectedCategory.name,
        diaCategory: selectedCategory.diaCategory,
        seoTitle: selectedCategory.seoTitle,
        seoUrl: selectedCategory.seoUrl,
        webOrder: selectedCategory.webOrder
      })
      setFileName('')
    } else {
      reset({
        name: '',
        diaCategory: '',
        seoTitle: '',
        seoUrl: '',
        webOrder: 0
      })
      setFileName('')
    }
  }, [selectedCategory, reset])

  // Form submit handler - düzenleme işlemi
  const onSubmit = (data: FormValues) => {
    if (!selectedCategory) return

    const updatedCategory: CategoryType = {
      ...selectedCategory,
      name: data.name,
      diaCategory: data.diaCategory,
      seoTitle: data.seoTitle,
      seoUrl: data.seoUrl,
      webOrder: data.webOrder
    }

    // Kategori listesini güncelle
    const newCategoryData = categoryData.map(cat => (cat.id === selectedCategory.id ? updatedCategory : cat))

    setData(newCategoryData)
    handleClose()
  }

  // Dosya seçildiğinde, sadece ismini gösteriyoruz (örnek amaçlı)
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (files && files.length > 0) {
      setFileName(files[0].name)
      // Eğer gerçek dosya yükleme işlemi yapılacaksa burada ekleyebilirsin
    }
  }

  const handleDiscard = () => {
    handleClose()
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleDiscard}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 400 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>Kategori Düzenle</Typography>
        <IconButton size='small' onClick={handleDiscard}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <div className='p-5'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
          <Controller
            name='name'
            control={control}
            rules={{ required: 'Kategori adı zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Kategori Adı'
                placeholder='Kategori Adı Giriniz'
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          <Controller
            name='diaCategory'
            control={control}
            rules={{ required: 'Kategori açıklaması zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Kategori Açıklama'
                placeholder='Kategori Açıklaması Giriniz'
                error={!!errors.diaCategory}
                helperText={errors.diaCategory?.message}
              />
            )}
          />

          <Controller
            name='seoTitle'
            control={control}
            rules={{ required: 'SEO Başlığı zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='SEO Başlık'
                placeholder='SEO Başlık Giriniz'
                error={!!errors.seoTitle}
                helperText={errors.seoTitle?.message}
              />
            )}
          />

          <Controller
            name='seoUrl'
            control={control}
            rules={{ required: 'SEO URL zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='SEO URL'
                placeholder='SEO URL Giriniz'
                error={!!errors.seoUrl}
                helperText={errors.seoUrl?.message}
              />
            )}
          />

          <Controller
            name='webOrder'
            control={control}
            rules={{ required: 'Öncelik zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='number'
                label='Öncelik'
                placeholder='Öncelik Giriniz'
                error={!!errors.webOrder}
                helperText={errors.webOrder?.message}
              />
            )}
          />

          <TextField
            size='small'
            placeholder='No file chosen'
            variant='outlined'
            value={fileName}
            className='flex-auto'
            InputProps={{
              readOnly: true,
              endAdornment: fileName ? (
                <InputAdornment position='end'>
                  <IconButton size='small' edge='end' onClick={() => setFileName('')}>
                    <i className='ri-close-line' />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          <Button component='label' variant='outlined' htmlFor='contained-button-file' className='min-is-fit'>
            Dosya Seçiniz
            <input hidden id='contained-button-file' type='file' onChange={handleFileUpload} ref={fileInputRef} />
          </Button>

          <div className='flex items-center gap-4'>
            <Button variant='contained' type='submit'>
              Kaydet
            </Button>
            <Button variant='outlined' color='error' onClick={handleDiscard}>
              Vazgeç
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default EditCategoryDrawer