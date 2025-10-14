'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Divider from '@mui/material/Divider'
import { FormControl } from '@mui/material'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

const Homepage = ({ formData, setFormData, handleSave, saving }) => {
  return (
    <Card>
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 10 }}>
          <CardHeader
            title='Anasayfa SEO Ayarları'
            subheader='Sitenize ait SEO Ayarlarını görüntüleyebilir ve güncelleyebilirsiniz.'
          />
          <Divider />
          <CardContent>
            <Grid container spacing={10} justifyContent="center">
              <Grid size={{ sm: 12 }}>
                <FormControl fullWidth>
                  <TextField
                    fullWidth
                    label='Anasayfa SEO Başlığı'
                    placeholder='Anasayfa SEO Başlığı'
                    value={formData.homepage.title}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      homepage: { ...prev.homepage, title: e.target.value }
                    }))}
                    inputProps={{ maxLength: 60 }}
                    helperText={
                      <span className="flex justify-between items-center mt-1 w-full">
                        <Typography variant="label" color="text.secondary">
                          Bu alan arama motorlarında başlık olarak görünecektir
                        </Typography>
                        <span className={formData.homepage.title.length <= 60 ? "text-green-500" : "text-red-500"}>
                          {formData.homepage.title.length}/60
                        </span>
                      </span>
                    }
                  />
                </FormControl>
              </Grid>
              <Grid size={{ sm: 12 }}>
                <FormControl fullWidth>
                  <TextField
                    fullWidth
                    label='Anasayfa SEO Açıklaması'
                    placeholder='Anasayfa SEO açıklaması giriniz'
                    value={formData.homepage.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      homepage: { ...prev.homepage, description: e.target.value }
                    }))}
                    multiline
                    rows={3}
                    inputProps={{ maxLength: 160 }}
                    helperText={
                      <span className="flex justify-between items-center mt-1 w-full">
                        <Typography variant="label" color="text.secondary">
                          Bu alan arama motorlarında açıklama olarak görünecektir
                        </Typography>
                        <span className={formData.homepage.description.length <= 160 ? "text-green-500" : "text-red-500"}>
                          {formData.homepage.description.length}/160
                        </span>
                      </span>
                    }
                  />
                </FormControl>
              </Grid>
              <Grid size={{ sm: 12 }}>
                <FormControl fullWidth>
                  <TextField
                    fullWidth
                    label='Anasayfa SEO Anahtar Kelimeleri'
                    placeholder='Anasayfa SEO anahtar kelimeleri giriniz'
                    value={formData.homepage.keywords}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      homepage: { ...prev.homepage, keywords: e.target.value }
                    }))}
                    helperText={
                      <span className="flex justify-between items-center mt-1 w-full">
                        <Typography variant="label" color="text.secondary">
                          Virgül ile ayırarak birden fazla anahtar kelime girebilirsiniz
                        </Typography>
                      </span>
                    }
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }} className='flex gap-4 flex-wrap justify-end'>
                <Button
                  variant='contained'
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Grid>
      </Grid >
    </Card >
  )
}

export default Homepage