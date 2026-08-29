'use client'

import { Card, CardHeader, CardContent, TextField } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useSettings } from '@/contexts/SettingsContext'

export default function EmailInfoSettings() {
    const { settings, updateField } = useSettings()

    const emailInfo = settings?.emailInfo || {}

    return (
        <Card>
            <CardHeader title='Firma E-mail Bilgileri' />
            <CardContent>
                <Grid container spacing={5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label='E-mail Adresi'
                            placeholder='info@alastik.com'
                            defaultValue={emailInfo.email || ''}
                            onChange={(e) => updateField('emailInfo', 'email', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label='Sipariş E-mail Adresi'
                            placeholder='siparis@alastik.com'
                            defaultValue={emailInfo.orderEmail || ''}
                            onChange={(e) => updateField('emailInfo', 'orderEmail', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label='Geri Arama Formu E-mail Adresi'
                            placeholder='Boşsa E-mail Adresi kullanılır'
                            helperText='Anasayfadaki "Biz Sizi Arayalım" talepleri bu adrese gider'
                            defaultValue={emailInfo.callbackEmail || ''}
                            onChange={(e) => updateField('emailInfo', 'callbackEmail', e.target.value)}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}