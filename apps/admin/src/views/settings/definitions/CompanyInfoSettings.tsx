'use client'

import { Card, CardHeader, CardContent, TextField } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useSettings } from '@/contexts/SettingsContext'

export default function CompanyInfoSettings() {
    const { settings, updateField } = useSettings()

    const companyInfo = settings?.companyInfo || {}

    return (
        <Card>
            <CardHeader title='Firma Bilgileri' />
            <CardContent>
                <Grid container spacing={5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label='Firma Adı'
                            placeholder='A Lastik'
                            defaultValue={companyInfo.name || ''}
                            onChange={(e) => updateField('companyInfo', 'name', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label='Firma Resmi Adı'
                            placeholder='A Lastik Ticaret A.Ş.'
                            defaultValue={companyInfo.officialName || ''}
                            onChange={(e) => updateField('companyInfo', 'officialName', e.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label='Firma İnternet Sitesi'
                            placeholder='https://www.alastik.com'
                            defaultValue={companyInfo.website || ''}
                            onChange={(e) => updateField('companyInfo', 'website', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label='Yetkili Kişi'
                            placeholder='Cengiz DEMİR'
                            defaultValue={companyInfo.authorizedPerson || ''}
                            onChange={(e) => updateField('companyInfo', 'authorizedPerson', e.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth
                            label='Firma Telefon Numarası'
                            placeholder='0212 123 45 67'
                            defaultValue={companyInfo.phone || ''}
                            onChange={(e) => updateField('companyInfo', 'phone', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth
                            label='Firma Telefon Numarası 2'
                            placeholder='0212 765 43 21'
                            defaultValue={companyInfo.phone2 || ''}
                            onChange={(e) => updateField('companyInfo', 'phone2', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth
                            label='Faks Numarası'
                            placeholder='0212 123 45 68'
                            defaultValue={companyInfo.fax || ''}
                            onChange={(e) => updateField('companyInfo', 'fax', e.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            label='Ülke'
                            placeholder='Türkiye'
                            defaultValue={companyInfo.country || ''}
                            onChange={(e) => updateField('companyInfo', 'country', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            label='Şehir'
                            placeholder='İstanbul'
                            defaultValue={companyInfo.city || ''}
                            onChange={(e) => updateField('companyInfo', 'city', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            label='İlçe'
                            placeholder='Kadıköy'
                            defaultValue={companyInfo.district || ''}
                            onChange={(e) => updateField('companyInfo', 'district', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            label='Posta Kodu'
                            placeholder='34000'
                            defaultValue={companyInfo.postalCode || ''}
                            onChange={(e) => updateField('companyInfo', 'postalCode', e.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label='Firma Açık Adresi'
                            placeholder='Tam adres bilgisi...'
                            defaultValue={companyInfo.address || ''}
                            onChange={(e) => updateField('companyInfo', 'address', e.target.value)}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}