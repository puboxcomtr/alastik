'use client'

import { Suspense, useEffect, useState } from 'react'
import { Box, CircularProgress, Typography, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'

// Components
import CompanyInfoSettings from '@/views/settings/definitions/CompanyInfoSettings'
import EmailInfoSettings from '@/views/settings/definitions/EmailInfoSettings'
import TaxInfoSettings from '@/views/settings/definitions/TaxInfoSettings'
import ServicePointsSettings from '@/views/settings/definitions/ServicePointsSettings'
import LegalContractsSettings from '@/views/settings/definitions/LegalContractsSettings'
import ImagesSettings from '@/views/settings/definitions/ImagesSettings'

// Context
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext'
import { fetchAPI } from '@libs/api'

function SettingsHeader() {
    const { hasChanges, isLoading, saveChanges } = useSettings()

    const handleSave = async () => {
        await saveChanges()
    }

    return (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
                <Typography variant='h4' sx={{ mb: 1 }}>
                    Tanımlamalar
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    Site genelindeki firma bilgilerini, yasal sözleşmeleri ve diğer tanımlamaları yönetin
                </Typography>
            </Box>

            <Button
                variant='contained'
                onClick={handleSave}
                disabled={!hasChanges || isLoading}
                color={hasChanges ? "primary" : "inherit"}
            >
                {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
        </Box>
    )
}

function SettingsContent() {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 8 }} container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <CompanyInfoSettings />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <EmailInfoSettings />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TaxInfoSettings />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <ServicePointsSettings />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <LegalContractsSettings />
                </Grid>
            </Grid>

            <Grid size={{ xs: 4 }} container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <ImagesSettings />
                </Grid>
            </Grid>
        </Grid>
    )
}

export default function DefinitionsPage() {
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchSettings() {
            try {
                const data = await fetchAPI(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'}/admin/settings/general`, {
                    cache: 'no-store'
                })
                setSettings(data.success ? data.data : null)
            } catch (error) {
                console.error('Settings fetch error:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchSettings()
    }, [])

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <SettingsProvider initialSettings={settings}>
            <Suspense fallback={
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            }>
                <SettingsHeader />
                <SettingsContent />
            </Suspense>
        </SettingsProvider>
    )
}