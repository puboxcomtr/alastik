'use client'

import { Card, CardHeader, CardContent, TextField } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useSettings } from '@/contexts/SettingsContext'

export default function TaxInfoSettings() {
    const { settings, updateField } = useSettings()

    const taxInfo = settings?.taxInfo || {}

    return (
        <Card>
            <CardHeader title='Firma Sicil Bilgileri' />
            <CardContent>
                <Grid container spacing={5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth
                            label='Sicil Numarası'
                            placeholder='12345'
                            defaultValue={taxInfo.registrationNumber || ''}
                            onChange={(e) => updateField('taxInfo', 'registrationNumber', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth
                            label='Vergi Dairesi'
                            placeholder='Kadıköy'
                            defaultValue={taxInfo.taxOffice || ''}
                            onChange={(e) => updateField('taxInfo', 'taxOffice', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth
                            label='Vergi Numarası'
                            placeholder='1234567890'
                            defaultValue={taxInfo.taxNumber || ''}
                            onChange={(e) => updateField('taxInfo', 'taxNumber', e.target.value)}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}