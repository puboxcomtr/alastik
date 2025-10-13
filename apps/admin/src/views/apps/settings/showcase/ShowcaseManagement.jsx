'use client'

import { useRef } from 'react'
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

const ShowcaseManagement = ({ formData, setFormData }) => {
  const fileInputRef = useRef(null)

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
            <>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Filigran Konumu</InputLabel>
                  <Select
                    label="Filigran Konumu"
                    value={formData.watermarkPosition}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      watermarkPosition: e.target.value
                    }))}
                  >
                    <MenuItem value="sol-ust">Sol Üst</MenuItem>
                    <MenuItem value="sag-ust">Sağ Üst</MenuItem>
                    <MenuItem value="sol-alt">Sol Alt</MenuItem>
                    <MenuItem value="sag-alt">Sağ Alt</MenuItem>
                    <MenuItem value="orta">Orta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth>
                  <Button
                    component="label"
                    variant="outlined"
                    fullWidth
                    startIcon={<i className='ri-upload-2-line' />}
                    sx={{
                      height: '56px',
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      color: 'text.secondary'
                    }}
                  >
                    {formData.watermarkImage ? formData.watermarkImage.name : 'Filigran Görseli Seç'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*"
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
                  {formData.watermarkImage && (
                    <Typography variant='caption' color='text.secondary' className='block mt-1'>
                      Seçilen: {formData.watermarkImage.name}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </>
          )}
          
          {formData.watermarkImagePreview && (
            <Grid size={{ xs: 12, sm: 3 }}>
              <Card variant='outlined'>
                <CardContent className='flex flex-col items-center gap-2'>
                  <img
                    src={formData.watermarkImagePreview}
                    alt="Filigran önizleme"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '150px',
                      objectFit: 'contain'
                    }}
                  />
                  <Button
                    size='small'
                    color='error'
                    variant='outlined'
                    startIcon={<i className='ri-delete-bin-line' />}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                      if (formData.watermarkImagePreview && formData.watermarkImagePreview.startsWith('blob:')) {
                        URL.revokeObjectURL(formData.watermarkImagePreview)
                      }
                      setFormData((prev) => ({
                        ...prev,
                        watermarkImage: null,
                        watermarkImagePreview: null
                      }))
                    }}
                  >
                    Görseli Kaldır
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ShowcaseManagement