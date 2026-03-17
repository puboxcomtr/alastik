'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormLabel from '@mui/material/FormLabel'
import Typography from '@mui/material/Typography'
import { FormControl, Switch } from '@mui/material'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

const ProductManagament = ({ formData, setFormData }) => {
  return (
    <Card>
      <CardHeader title='Ürün Yönetimi' />
      <CardContent>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl component='fieldset'>
              <div className='flex items-start gap-3'>
                <Switch
                  id="hidePricelessProducts"
                  checked={formData.hidePricelessProducts}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    hidePricelessProducts: e.target.checked
                  }))}
                />
                <div>
                  <FormLabel
                    component='label'
                    htmlFor='hidePricelessProducts'
                    className='text-base font-medium mb-1 cursor-pointer'
                  >
                    Fiyatsız Ürünleri Gizle
                  </FormLabel>
                  <Typography variant='caption' color='text.secondary' className='block'>
                    Aktif edildiğinde fiyatı olmayan ürünler vitrin ve listeleme sayfalarında gizlenir.
                  </Typography>
                </div>
              </div>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl component='fieldset'>
              <div className='flex items-start gap-3'>
                <Switch
                  id="recommendedProducts"
                  checked={formData.recommendedProducts}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    recommendedProducts: e.target.checked
                  }))}
                />
                <div>
                  <FormLabel
                    component='label'
                    htmlFor='recommendedProducts'
                    className='text-base font-medium mb-1 cursor-pointer'
                  >
                    Tavsiye Ürünler
                  </FormLabel>
                  <Typography variant='caption' color='text.secondary' className='block'>
                    Ürün Düzenleme menülerinde Tavsiye Edilen Ürün Ekleme seçeneğini aktif hale getirir.
                  </Typography>
                </div>
              </div>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Otomatik Yorum Onayı</InputLabel>
              <Select
                label='Otomatik Yorum Onayı'
                value={formData.autoCommentApproval}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  autoCommentApproval: e.target.value
                }))}
              >
                <MenuItem value='1'>Evet</MenuItem>
                <MenuItem value='2'>Hayır</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Yorumlarda Alan Zorunluluğu</InputLabel>
              <Select
                label='Yorumlarda Alan Zorunluluğu'
                value={formData.commentFieldRequirement}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  commentFieldRequirement: e.target.value
                }))}
              >
                <MenuItem value='1'>Yalnızca Puan Zorunlu</MenuItem>
                <MenuItem value='2'>Puan ve Başlık Zorunlu</MenuItem>
                <MenuItem value='3'>Puan, Başlık ve Detaylı Bilgi Zorunlu</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductManagament