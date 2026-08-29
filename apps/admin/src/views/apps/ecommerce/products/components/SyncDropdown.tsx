'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

const SyncDropdown = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [loading, setLoading] = useState(false)
    const [reordering, setReordering] = useState(false)
    const open = Boolean(anchorEl)
    const router = useRouter()
    const { lang: locale } = useParams()

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleFullSync = async () => {
        handleClose()
        setLoading(true)

        try {
            const data = await fetchAPI(API_ENDPOINTS.diaSync.fullSync(), {
                method: 'POST'
            })

            if (data.success) {
                toast.info('Tam senkronizasyon başlatıldı. DIA Ayarları sayfasından takip edebilirsiniz.')
            } else {
                toast.error(data.message || 'Senkronizasyon başlatılamadı')
            }
        } catch {
            toast.error('Senkronizasyon başlatılamadı')
        } finally {
            setLoading(false)
        }
    }

    const handleLightSync = async () => {
        handleClose()
        setLoading(true)

        try {
            const data = await fetchAPI(API_ENDPOINTS.diaSync.lightSync(), {
                method: 'POST'
            })

            if (data.success) {
                toast.info('Fiyat ve stok güncelleme başlatıldı. DIA Ayarları sayfasından takip edebilirsiniz.')
            } else {
                toast.error(data.message || 'Güncelleme başlatılamadı')
            }
        } catch {
            toast.error('Güncelleme başlatılamadı')
        } finally {
            setLoading(false)
        }
    }

    const handleReorderLabelImages = async () => {
        setReordering(true)

        try {
            const data = await fetchAPI(API_ENDPOINTS.products.reorderLabelImages(), {
                method: 'POST'
            })

            if (data.success) {
                toast.success(data.message || 'Görsel sıralaması oluşturuldu')
            } else {
                toast.error(data.message || 'Görsel sıralaması oluşturulamadı')
            }
        } catch {
            toast.error('Görsel sıralaması oluşturulamadı')
        } finally {
            setReordering(false)
        }
    }

    return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
                variant="contained"
                onClick={handleClick}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
                {loading ? 'Başlatılıyor...' : 'Ürünleri Senkronize Et'}
            </Button>

            <Button
                variant="outlined"
                color="secondary"
                startIcon={<i className='ri-file-text-line' />}
                onClick={() => router.push(`/${locale}/apps/products/templates`)}
            >
                Açıklama Şablonları
            </Button>

            <Button
                variant="outlined"
                color="secondary"
                disabled={reordering}
                startIcon={reordering ? <CircularProgress size={16} color="inherit" /> : <i className='ri-image-line' />}
                onClick={handleReorderLabelImages}
            >
                {reordering ? 'Sıralanıyor...' : 'Görsel Sıralama Oluştur'}
            </Button>

            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                <MenuItem onClick={handleFullSync} disabled={loading}>
                    Tam Senkronizasyon
                </MenuItem>
                <MenuItem onClick={handleLightSync} disabled={loading}>
                    Sadece Fiyat ve Stok Güncelle
                </MenuItem>
            </Menu>
        </Box>
    )
}

export default SyncDropdown