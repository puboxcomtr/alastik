// React Imports
import { useEffect, useState, useRef } from 'react'
import type { ChangeEvent } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'

// Third-party Imports
import { useForm, Controller } from 'react-hook-form'

// Type Imports
import type { categoryType } from './ProductCategoryTable'

type Props = {
  open: boolean
  handleClose: () => void
  categoryData: categoryType[]
  selectedCategory: categoryType | null
  setData: (data: categoryType[]) => void
}

type FormValues = {
  title: string
  description: string
  meta_title: string
  meta_description: string
  detail: string
  order: number
  image: string
}

const EditLabelDrawer = ({ open, handleClose, categoryData, selectedCategory, setData }: Props) => {
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // React Hook Form kullanıyoruz
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      meta_title: '',
      meta_description: '',
      detail: '',
      order: 0,
      image: ''
    }
  })

  // Seçili kategori değiştiğinde formu resetle (alanları doldur)
  useEffect(() => {
    if (selectedCategory) {
      reset({
        title: selectedCategory.categoryTitle,
        description: selectedCategory.description,
        meta_title: '',
        meta_description: '',
        detail: '',
        order: selectedCategory.order,
        image: selectedCategory.image
      })
      // Dosya adı görüntüleme için:
      const imgParts = selectedCategory.image.split('/')
      setFileName(imgParts[imgParts.length - 1] || '')
    } else {
      reset({
        title: '',
        description: '',
        meta_title: '',
        meta_description: '',
        detail: '',
        order: 0,
        image: ''
      })
      setFileName('')
    }
  }, [selectedCategory, reset])

  // Form submit handler - düzenleme işlemi
  const onSubmit = (data: FormValues) => {
    if (!selectedCategory) return

    const updatedCategory: categoryType = {
      ...selectedCategory,
      categoryTitle: data.title,
      description: data.description,
      order: data.order,
      image: data.image || selectedCategory.image
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
            name='title'
            control={control}
            rules={{ required: 'Kategori başlığı zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Kategori Başlık'
                placeholder='Kategori Başlık Giriniz'
                error={!!errors.title}
                helperText={errors.title?.message}
              />
            )}
          />

          <Controller
            name='description'
            control={control}
            rules={{ required: 'Kategori açıklaması zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Kategori Açıklama'
                placeholder='Kategori Açıklaması Giriniz'
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />
          <Controller
            name='meta_title'
            control={control}
            rules={{ required: 'Meta Başlığı Açıklaması Zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Meta Başlık'
                placeholder='Meta Başlık Giriniz'
                error={!!errors.meta_title}
                helperText={errors.meta_title?.message}
              />
            )}
          />
          <Controller
            name='meta_description'
            control={control}
            rules={{ required: 'Meta Açıklaması Zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Meta Açıklaması'
                placeholder='Meta Açıklaması Giriniz'
                error={!!errors.meta_description}
                helperText={errors.meta_description?.message}
              />
            )}
          />
          <Controller
            name='detail'
            control={control}
            rules={{ required: 'Kategori Detay Zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                multiline
                minRows={4}
                fullWidth
                label='Kategori Detay Açıklaması'
                placeholder='Kategori Detay Açıklaması Giriniz'
                error={!!errors.meta_description}
                helperText={errors.meta_description?.message}
              />
            )}
          />
          <Controller
            name='order'
            control={control}
            rules={{ required: 'Öncelik zorunludur' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='number'
                label='Öncelik'
                placeholder='Öncelik Giriniz'
                error={!!errors.order}
                helperText={errors.order?.message}
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

export default EditLabelDrawer
