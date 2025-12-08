'use client'

import { Card, CardHeader, CardContent, Typography, Box } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useSettings } from '@/contexts/SettingsContext'

export default function ImagesSettings() {
    const { settings, updateField } = useSettings()

    const images = settings?.images || {}

    return (
        <Card>
            <CardHeader title='Görseller' />
            <CardContent>
                <Grid container spacing={5}>
                    {/* Mail Logo */}
                    <Grid size={{ xs: 12, sm: 12 }}>
                        <Typography variant='subtitle1' className='mb-2'>Mail Logo</Typography>
                        <Box
                            sx={{
                                border: '2px dashed #ccc',
                                borderRadius: 2,
                                p: 3,
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': { borderColor: 'primary.main' }
                            }}
                        >
                            {images.mailLogo ? (
                                <img
                                    src={images.mailLogo}
                                    alt='Mail Logo'
                                    style={{ maxWidth: '200px', maxHeight: '100px' }}
                                />
                            ) : (
                                <Typography color='text.secondary'>Logo yüklemek için tıklayın</Typography>
                            )}
                            <input
                                type='file'
                                accept='image/*'
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    // Burada görsel upload işlemi yapılacak
                                    console.log('Mail logo:', e.target.files?.[0])
                                }}
                            />
                        </Box>
                    </Grid>

                    {/* Favicon */}
                    <Grid size={{ xs: 12, sm: 12 }}>
                        <Typography variant='subtitle1' className='mb-2'>Favicon</Typography>
                        <Box
                            sx={{
                                border: '2px dashed #ccc',
                                borderRadius: 2,
                                p: 3,
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': { borderColor: 'primary.main' }
                            }}
                        >
                            {images.favicon ? (
                                <img
                                    src={images.favicon}
                                    alt='Favicon'
                                    style={{ maxWidth: '64px', maxHeight: '64px' }}
                                />
                            ) : (
                                <Typography color='text.secondary'>Favicon yüklemek için tıklayın</Typography>
                            )}
                            <input
                                type='file'
                                accept='image/*'
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    // Burada görsel upload işlemi yapılacak
                                    console.log('Favicon:', e.target.files?.[0])
                                }}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}