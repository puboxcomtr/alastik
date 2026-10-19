'use client'

import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormLabel from '@mui/material/FormLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { FormControl, Switch } from '@mui/material'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'

import WatermarkPreview from './WatermarkPreview'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

const ShowcaseManagement = ({ formData, setFormData }) => {
  const fileInputRef = useRef(null)

  const [previewOpen, setPreviewOpen] = useState(false)

  const [categories, setCategories] = useState([])

  useEffect(() => {
    const kategorileriYukle = async () => {
      try {
        const response = await fetchAPI(API_ENDPOINTS.categories.list())

        setCategories(Array.isArray(response?.data) ? response.data : [])
      } catch {
        setCategories([])
      }
    }

    kategorileriYukle()
  }, [])

  const secilenKategoriler = formData.watermarkExcludedCategories
    .map((id) => categories.find((k) => String(k.id) === String(id)) || { id, name: String(id) })

  return (
    <Card>
      <CardHeader title='Vitrin Ayarları' />
      <CardContent>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl component='fieldset' fullWidth>
              <div className='flex flex-col gap-3'>
                <TextField
                  fullWidth
                  type='number'
                  label='Her Sayfadaki Ürün Adedi'
                  placeholder='Örn: 20'
                  value={formData.productsPerPage}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    productsPerPage: Number(e.target.value)
                  }))}
                />
              </div>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Vitrindeki Görsel Boyutları</InputLabel>
              <Select
                label="Vitrindeki Görsel Boyutları"
                value={formData.showcaseProductSize}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  showcaseProductSize: e.target.value
                }))}
              >
                <MenuItem value="600x600">600x600</MenuItem>
                <MenuItem value="960x960">960x960</MenuItem>
                <MenuItem value="1024x1024">1024x1024</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl component='fieldset'>
              <div className="flex items-start gap-3">
                <Switch
                  id="notPicture"
                  checked={formData.notPicture}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    notPicture: e.target.checked
                  }))}
                />
                <div>
                  <FormLabel
                    component='label'
                    htmlFor='notPicture'
                    className='text-base font-medium mb-1 cursor-pointer'
                  >
                    Resmi Olmayan Ürün Sıralaması
                  </FormLabel>
                  <Typography variant='caption' color='text.secondary' className='block'>
                    Resmi olmayan ürünleriniz varsa vitrin sıralamalarında en sonda gösterilecek şekilde konumlandırılır.
                  </Typography>
                </div>
              </div>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl component='fieldset'>
              <div className="flex items-start gap-3">
                <Switch 
                  id='pictureOptimization'
                  checked={formData.pictureOptimization}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    pictureOptimization: e.target.checked
                  }))}
                />
                <div>
                  <FormLabel
                    component='label'
                    htmlFor='pictureOptimization'
                    className='text-base font-medium mb-1 cursor-pointer'
                  >
                    Görsel Optimizasyon
                  </FormLabel>
                  <Typography variant='caption' color='text.secondary' className='block'>
                    Sitenize yüklediğiniz görsellerin kalitesinin sistem tarafından optimize edilmesini istiyorsanız bu ayarı aktif hale getirebilirsiniz.
                  </Typography>
                </div>
              </div>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl component='fieldset'>
              <div className="flex items-start gap-3">
                <Switch 
                  id="watermark"
                  checked={formData.watermark}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    watermark: e.target.checked
                  }))}
                />
                <div>
                  <FormLabel
                    component='label'
                    htmlFor='watermark'
                    className='text-base font-medium mb-1 cursor-pointer'
                  >
                    Filigran Kullanımı
                  </FormLabel>
                  <Typography variant='caption' color='text.secondary' className='block'>
                    Ürün görsellerinize filigran eklemek için bu ayarı aktif hale getirebilirsiniz.
                  </Typography>
                </div>
              </div>
            </FormControl>
          </Grid>
          
          {formData.watermark && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 5
                }}
              >
                <Typography variant='h6' className='mb-4'>
                  Filigran Ayarları
                </Typography>

                <Grid container spacing={6}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Filigran Konumu</InputLabel>
                      <Select
                        label='Filigran Konumu'
                        value={formData.watermarkPosition}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          watermarkPosition: e.target.value
                        }))}
                      >
                        <MenuItem value='sol-ust'>Sol Üst</MenuItem>
                        <MenuItem value='sag-ust'>Sağ Üst</MenuItem>
                        <MenuItem value='sol-alt'>Sol Alt</MenuItem>
                        <MenuItem value='sag-alt'>Sağ Alt</MenuItem>
                        <MenuItem value='orta'>Orta</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Filigran Yönü</InputLabel>
                      <Select
                        label='Filigran Yönü'
                        value={formData.watermarkRotation}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          watermarkRotation: e.target.value
                        }))}
                      >
                        <MenuItem value={0}>Yatay (0°)</MenuItem>
                        <MenuItem value={45}>Çapraz (45°)</MenuItem>
                        <MenuItem value={-45}>Ters Çapraz (-45°)</MenuItem>
                        <MenuItem value={90}>Dikey (90°)</MenuItem>
                        <MenuItem value={-90}>Ters Dikey (-90°)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box
                      sx={{
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        height: '100%',
                        minHeight: 56,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3
                      }}
                    >
                      {formData.watermarkImagePreview && (
                        <img
                          src={formData.watermarkImagePreview}
                          alt='Filigran'
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                        />
                      )}

                      <div className='flex flex-col items-start gap-1'>
                        <Button
                          component='label'
                          variant='outlined'
                          size='small'
                          startIcon={<i className='ri-upload-2-line' />}
                          sx={{ textTransform: 'none' }}
                        >
                          {formData.watermarkImagePreview ? 'Görseli Değiştir' : 'Filigran Görseli Seç'}
                          <input
                            ref={fileInputRef}
                            type='file'
                            hidden
                            accept='image/*'
                            onChange={(e) => {
                              const file = e.target.files?.[0]

                              if (file) {
                                const previewUrl = URL.createObjectURL(file)

                                setFormData((prev) => ({
                                  ...prev,
                                  watermarkImage: file,
                                  watermarkImagePreview: previewUrl
                                }))
                              }
                            }}
                          />
                        </Button>

                        {formData.watermarkImagePreview && (
                          <Button
                            size='small'
                            color='error'
                            startIcon={<i className='ri-delete-bin-line' />}
                            sx={{ textTransform: 'none' }}
                            onClick={() => {
                              if (fileInputRef.current) fileInputRef.current.value = ''

                              if (formData.watermarkImagePreview?.startsWith('blob:')) {
                                URL.revokeObjectURL(formData.watermarkImagePreview)
                              }

                              setFormData((prev) => ({
                                ...prev,
                                watermarkImage: null,
                                watermarkImagePreview: ''
                              }))
                            }}
                          >
                            Kaldır
                          </Button>
                        )}
                      </div>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth sx={{ pr: { sm: 6 } }}>
                      <FormLabel className='text-textPrimary'>
                        Filigran Genişliği: %{formData.watermarkWidth}
                      </FormLabel>
                      <Slider
                        sx={{ mx: 2, width: 'calc(100% - 32px)' }}
                        value={formData.watermarkWidth}
                        min={5}
                        max={100}
                        step={1}
                        valueLabelDisplay='auto'
                        valueLabelFormat={(deger) => `%${deger}`}
                        marks={[{ value: 5, label: '%5' }, { value: 100, label: '%100' }]}
                        onChange={(event, deger) => setFormData((prev) => ({
                          ...prev,
                          watermarkWidth: deger
                        }))}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        Ürün görselinin genişliğine oranla ölçeklenir
                      </Typography>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth sx={{ pl: { sm: 6 } }}>
                      <FormLabel className='text-textPrimary'>
                        Filigran Opaklığı: %{formData.watermarkOpacity}
                      </FormLabel>
                      <Slider
                        sx={{ mx: 2, width: 'calc(100% - 32px)' }}
                        value={formData.watermarkOpacity}
                        min={0}
                        max={100}
                        step={1}
                        valueLabelDisplay='auto'
                        valueLabelFormat={(deger) => `%${deger}`}
                        marks={[{ value: 0, label: '%0' }, { value: 100, label: '%100' }]}
                        onChange={(event, deger) => setFormData((prev) => ({
                          ...prev,
                          watermarkOpacity: deger
                        }))}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        Düşük değer daha saydam filigran demektir
                      </Typography>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={categories}
                      value={secilenKategoriler}
                      getOptionLabel={(secenek) => secenek.name || ''}
                      isOptionEqualToValue={(secenek, deger) => String(secenek.id) === String(deger.id)}
                      noOptionsText='Kategori bulunamadı'
                      slotProps={{ listbox: { sx: { maxHeight: 280 } } }}
                      onChange={(event, yeni) => setFormData((prev) => ({
                        ...prev,
                        watermarkExcludedCategories: yeni.map((k) => String(k.id))
                      }))}
                      renderOption={(props, secenek) => (
                        <li {...props} key={secenek.id}>
                          <div className='flex flex-col'>
                            <Typography variant='body2'>{secenek.name}</Typography>
                            {(secenek.parentPath || secenek.levelName) && (
                              <Typography variant='caption' color='text.secondary'>
                                {secenek.parentPath || secenek.levelName}
                              </Typography>
                            )}
                          </div>
                        </li>
                      )}
                      renderTags={(deger, getTagProps) =>
                        deger.map((secenek, index) => {
                          const { key, ...tagProps } = getTagProps({ index })

                          return <Chip key={key} size='small' label={secenek.name} {...tagProps} />
                        })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label='Filigran Uygulanmayacak Kategoriler'
                          placeholder='Kategori arayın'
                          helperText='Seçilen kategorilerin ürün görsellerine filigran basılmaz. Üst kategori seçilirse alt kategorileri de kapsanır.'
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <div className='flex items-center gap-3'>
                      <Switch
                        id='watermarkPreview'
                        checked={previewOpen}
                        onChange={(e) => setPreviewOpen(e.target.checked)}
                      />
                      <FormLabel
                        component='label'
                        htmlFor='watermarkPreview'
                        className='text-base font-medium cursor-pointer'
                      >
                        Önizlemeyi Gör
                      </FormLabel>
                    </div>
                  </Grid>

                  {previewOpen && (
                    <Grid size={{ xs: 12 }}>
                      <WatermarkPreview formData={formData} />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Grid>
          )}

        </Grid>
      </CardContent>
    </Card>
  )
}

export default ShowcaseManagement