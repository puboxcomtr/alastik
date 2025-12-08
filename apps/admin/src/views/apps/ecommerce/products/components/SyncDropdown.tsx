'use client'

import { useState } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

const SyncDropdown = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentProduct, setCurrentProduct] = useState('')
    const open = Boolean(anchorEl)

    const syncOptions = [
        { id: 'names', label: 'Sadece Ürün İsimlerini Güncelle' },
        { id: 'codes', label: 'Sadece Stok Kodlarını Güncelle' },
        { id: 'prices', label: 'Sadece Fiyatları Güncelle' },
        { id: 'images', label: 'Sadece Görselleri Güncelle' },
        { id: 'all', label: 'Tümünü Güncelle' }
    ]

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleSync = async (syncType: string) => {
        handleClose()
        setLoading(true)
        setProgress(0)

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
            let endpoint = `${baseUrl}/dia-stock/sync`;
            if (syncType === 'names') {
                endpoint = `${baseUrl}/dia-stock/sync-names`;
            } else if (syncType === 'codes') {
                endpoint = `${baseUrl}/dia-stock/sync-codes`;
            } else if (syncType === 'prices') {
                endpoint = `${baseUrl}/dia-stock/sync-prices`;
            } else if (syncType === 'images') {
                endpoint = `${baseUrl}/dia-stock/sync-images`;
            }
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: syncType })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            setProgress(100);
            setCurrentProduct(`Tamamlandı: ${result.message}`);

            setTimeout(() => {
                setLoading(false);
                setCurrentProduct('');
                setProgress(0);
            }, 3000);

        } catch (error) {
            console.error('Sync hatası:', error)
            setLoading(false)
            setProgress(0)
            setCurrentProduct(`Hata: ${error.message}`)

            setTimeout(() => {
                setCurrentProduct('')
            }, 3000)
        }
    }

    return (
        <Box>
            <Button
                variant="contained"
                onClick={handleClick}
                disabled={loading}
            >
                {loading ? 'Senkronize Ediliyor...' : 'Ürünleri Senkronize Et (DİA)'}
            </Button>

            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                {syncOptions.map((option) => (
                    <MenuItem
                        key={option.id}
                        onClick={() => handleSync(option.id)}
                        disabled={loading}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Menu>

            {loading && (
                <Box sx={{ width: '100%', mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        İlerleme: %{Math.round(progress)}
                    </Typography>
                    <LinearProgress variant="determinate" value={progress} />
                    {currentProduct && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            {currentProduct}
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    )
}

export default SyncDropdown