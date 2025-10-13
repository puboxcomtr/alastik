'use client'

import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { FormControl, Select, Switch } from '@mui/material'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

const Brand = () => {
    const [formData, setFormData] = useState({
        homePageTitle: '',
        homePageKeywords: '',
        homePageDescription: ''
    })
    return (
        <Card>
            <Grid container size={{ xs: 12, md: 8 }}>
                <CardHeader
                    title='Marka SEO Ayarları'
                    subheader='Sitenize ait SEO Ayarlarını görüntüleyebilir ve güncelleyebilirsiniz.'
                />
                <Divider />
                <CardContent>
                    <Grid container spacing={12}>
                        <Grid size={{ sm: 6 }}>
                            <FormControl fullWidth>
                                <TextField
                                    fullWidth
                                    label='Anasayfa SEO Başlığı'
                                    placeholder='Anasayfa SEO Başlığı'
                                    value={formData.homePageTitle}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        homePageTitle: e.target.value
                                    }))}
                                    inputProps={{ maxLength: 60 }}
                                    helperText={
                                        <span className="flex justify-between items-center">
                                            <span>Bu alan arama motorlarında başlık olarak görünecektir</span>
                                            <span className={formData.homePageTitle.length <= 60 ? "text-green-500" : "text-red-500"}>
                                                {formData.homePageTitle.length}/60
                                            </span>
                                        </span>
                                    }
                                />
                            </FormControl>
                        </Grid>
                        <Grid size={{ sm: 6 }}>
                            <FormControl fullWidth>
                                <TextField
                                    fullWidth
                                    label='Anasayfa SEO Anahtar Kelimeleri'
                                    placeholder='Örn: lastik, oto lastik, otomobil lastiği'
                                    value={formData.homePageKeywords}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        homePageKeywords: e.target.value
                                    }))}
                                    helperText="Virgül ile ayırarak birden fazla anahtar kelime girebilirsiniz"
                                />
                            </FormControl>
                        </Grid>
                        <Grid size={{ sm: 12 }}>
                            <FormControl fullWidth>
                                <TextField
                                    fullWidth
                                    label='Anasayfa SEO Açıklaması'
                                    placeholder='Anasayfa SEO Açıklaması'
                                    value={formData.homePageDescription}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        homePageDescription: e.target.value
                                    }))}
                                    multiline
                                    rows={3}
                                    inputProps={{ maxLength: 160 }}
                                    helperText={
                                        <span className="flex justify-between items-center">
                                            <span>Bu alan arama motorlarında açıklama olarak görünecektir</span>
                                            <span className={formData.homePageDescription.length <= 160 ? "text-green-500" : "text-red-500"}>
                                                {formData.homePageDescription.length}/160
                                            </span>
                                        </span>
                                    }
                                />
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Grid>
        </Card >
    )
}

export default Brand