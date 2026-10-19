'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Divider from '@mui/material/Divider'
import { FormControl } from '@mui/material'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

const Product = ({ formData, setFormData, handleSave, saving }) => {
    const variables = [
        { key: '{urun-adi}', description: 'Ürün adı' },
        { key: '{urun-aciklamasi}', description: 'Ürün açıklaması' },
        { key: '{marka-adi}', description: 'Ürün markası' },
        { key: '{kategori-adi}', description: 'Ürün kategorisi' },
        { key: '{genel-baslik}', description: 'Site genel başlığı' },
        { key: '{fiyat}', description: 'Ürün fiyatı' }
    ]
    return (
        <Card>
            <Grid spacing={10} container justifyContent="center">
                <Grid size={{ xs: 12, md: 10 }}>
                    <CardHeader
                        title='Ürün SEO Şablonları'
                        subheader='Ürün sayfaları için SEO şablonlarını oluşturun. Değişkenler otomatik olarak gerçek verilerle değiştirilecektir.'
                    />
                    <Divider />

                    <CardContent>
                        <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
                            <Typography variant='subtitle2' className='mb-2 font-semibold'>
                                Kullanılabilir Değişkenler:
                            </Typography>
                            <div className='flex flex-wrap gap-2'>
                                {variables.map((v) => (
                                    <Chip
                                        key={v.key}
                                        label={`${v.key} - ${v.description}`}
                                        size='small'
                                        variant='outlined'
                                    />
                                ))}
                            </div>
                        </div>

                        <Grid container spacing={10}>
                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth>
                                    <TextField
                                        fullWidth
                                        label='Ürün SEO Başlık Şablonu'
                                        placeholder='Örn: {urun-adi} - {marka-adi} - {genel-baslik}'
                                        value={formData.product.titleTemplate}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            product: { ...prev.product, titleTemplate: e.target.value }
                                        }))}
                                        inputProps={{ maxLength: 60 }}
                                        helperText={
                                            <span className="flex justify-between items-center mt-1 w-full">
                                                <Typography variant="label" color="text.secondary">
                                                    Bu şablon tüm ürün sayfalarında kullanılacaktır
                                                </Typography>
                                                <span className={formData.product.titleTemplate.length <= 60 ? "text-green-500" : "text-red-500"}>
                                                    {formData.product.titleTemplate.length}/60
                                                </span>
                                            </span>
                                        }
                                    />
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth>
                                    <TextField
                                        fullWidth
                                        label='Ürün SEO Açıklama Şablonu'
                                        placeholder='Örn: {urun-adi} ürününü {fiyat} TL fiyatla satın alabilirsiniz.'
                                        value={formData.product.descriptionTemplate}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            product: { ...prev.product, descriptionTemplate: e.target.value }
                                        }))}
                                        multiline
                                        rows={3}
                                        inputProps={{ maxLength: 160 }}
                                        helperText={
                                            <span className="flex justify-between items-center mt-1 w-full">
                                                <Typography variant="label" color="text.secondary">
                                                    Bu şablon tüm ürün sayfalarında kullanılacaktır
                                                </Typography>
                                                <span className={formData.product.descriptionTemplate.length <= 160 ? "text-green-500" : "text-red-500"}>
                                                    {formData.product.descriptionTemplate.length}/160
                                                </span>
                                            </span>
                                        }
                                    />
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth>
                                    <TextField
                                        fullWidth
                                        label='Ürün SEO Anahtar Kelimeler Şablonu'
                                        placeholder='Örn: {urun-adi}, {marka-adi}, {kategori-adi}'
                                        value={formData.product.keywordsTemplate}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            product: { ...prev.product, keywordsTemplate: e.target.value }
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
            </Grid>
        </Card>
    )
}

export default Product