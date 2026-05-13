'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import TablePagination from '@mui/material/TablePagination'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

import tableStyles from '@core/styles/table.module.css'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type Template = {
    id: string
    name: string
    models: string[]
    modelCount: number
    isActive: boolean
    appliedCount: number
    lastAppliedAt: string | null
    updatedAt: string
}

const TemplatesListTable = () => {
    const router = useRouter()
    const { lang: locale } = useParams()

    const [data, setData] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [total, setTotal] = useState(0)
    const [applyAllDialog, setApplyAllDialog] = useState(false)
    const [applyAllOverride, setApplyAllOverride] = useState(false)
    const [applyAllLoading, setApplyAllLoading] = useState(false)

    const loadTemplates = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', String(page))
            params.set('limit', String(limit))
            if (search.trim()) params.set('search', search.trim())

            const res = await fetchAPI(`${API_ENDPOINTS.descriptionTemplates.list()}?${params.toString()}`, {
                cache: 'no-store'
            })

            if (res.success) {
                setData(res.data || [])
                setTotal(res.meta?.total || 0)
            }
        } catch (err) {
            toast.error('Şablonlar yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTemplates()
    }, [page, limit])

    const handleSearchSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setPage(1)
            loadTemplates()
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`"${name}" şablonu silinecek. Emin misiniz?`)) return

        try {
            const res = await fetchAPI(API_ENDPOINTS.descriptionTemplates.delete(id), {
                method: 'DELETE'
            })
            if (res.success) {
                toast.success('Şablon silindi')
                loadTemplates()
            } else {
                toast.error(res.message || 'Silme başarısız')
            }
        } catch (err) {
            toast.error('Silme sırasında hata oluştu')
        }
    }
    const handleApplyAll = async () => {
        setApplyAllLoading(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.descriptionTemplates.applyAll(), {
                method: 'POST',
                body: JSON.stringify({ overrideExisting: applyAllOverride })
            })

            if (res.success) {
                const d = res.data || {}
                toast.success(
                    `${d.totalTemplates || 0} şablon işlendi, ${d.totalModified || 0} ürün güncellendi`
                )
                setApplyAllDialog(false)
                setApplyAllOverride(false)
                loadTemplates()
            } else {
                toast.error(res.message || 'Toplu uygulama başarısız')
            }
        } catch (err) {
            toast.error('Toplu uygulama sırasında hata oluştu')
        } finally {
            setApplyAllLoading(false)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <Card>
            <CardHeader
                title='Açıklama Şablonları'
                action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant='outlined'
                            color='success'
                            startIcon={<i className='ri-flashlight-line' />}
                            onClick={() => setApplyAllDialog(true)}
                        >
                            Tümünü Uygula
                        </Button>
                        <Button
                            variant='contained'
                            startIcon={<i className='ri-add-line' />}
                            onClick={() => router.push(`/${locale}/apps/products/templates/new`)}
                        >
                            Yeni Şablon
                        </Button>
                    </Box>
                }
            />
            <Divider />

            <CardContent>
                <TextField
                    fullWidth
                    size='small'
                    placeholder='Şablon adı ile ara...'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position='start'>
                                <i className='ri-search-line' />
                            </InputAdornment>
                        )
                    }}
                />
            </CardContent>

            <Divider />

            <Box sx={{ position: 'relative' }}>
                {loading && (
                    <Box sx={{
                        position: 'absolute', inset: 0, zIndex: 1000,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minHeight: 200
                    }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th>Şablon Adı</th>
                                <th>Atanmış Modeller</th>
                                <th>Durum</th>
                                <th>Uygulanma</th>
                                <th>Son Güncelleme</th>
                                <th style={{ width: 120 }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={6} className='text-center'>Şablon bulunamadı</td>
                                </tr>
                            ) : (
                                data.map(t => (
                                    <tr key={t.id}>
                                        <td>
                                            <Typography variant='body2' fontWeight='bold'>{t.name}</Typography>
                                        </td>
                                        <td>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 360 }}>
                                                {t.models.slice(0, 4).map(m => (
                                                    <Chip key={m} label={m} size='small' variant='outlined' />
                                                ))}
                                                {t.models.length > 4 && (
                                                    <Chip label={`+${t.models.length - 4}`} size='small' />
                                                )}
                                                {t.models.length === 0 && (
                                                    <Typography variant='caption' color='text.secondary'>Atanmamış</Typography>
                                                )}
                                            </Box>
                                        </td>
                                        <td>
                                            <Chip
                                                label={t.isActive ? 'Aktif' : 'Pasif'}
                                                size='small'
                                                color={t.isActive ? 'success' : 'default'}
                                            />
                                        </td>
                                        <td>
                                            <Box>
                                                <Typography variant='body2'>{t.appliedCount} ürün</Typography>
                                                <Typography variant='caption' color='text.secondary'>
                                                    {formatDate(t.lastAppliedAt)}
                                                </Typography>
                                            </Box>
                                        </td>
                                        <td>
                                            <Typography variant='body2' color='text.secondary'>
                                                {formatDate(t.updatedAt)}
                                            </Typography>
                                        </td>
                                        <td>
                                            <Tooltip title='Düzenle'>
                                                <IconButton
                                                    size='small'
                                                    onClick={() => router.push(`/${locale}/apps/products/templates/edit/${t.id}`)}
                                                >
                                                    <i className='ri-edit-box-line' />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title='Sil'>
                                                <IconButton size='small' color='error' onClick={() => handleDelete(t.id, t.name)}>
                                                    <i className='ri-delete-bin-line' />
                                                </IconButton>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Box>

            <TablePagination
                component='div'
                count={total}
                page={page - 1}
                rowsPerPage={limit}
                rowsPerPageOptions={[20, 50, 100]}
                onPageChange={(_, p) => setPage(p + 1)}
                onRowsPerPageChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
            />

            <Dialog open={applyAllDialog} onClose={() => !applyAllLoading && setApplyAllDialog(false)} maxWidth='sm' fullWidth>
                <DialogTitle>Tüm Şablonları Uygula</DialogTitle>
                <DialogContent>
                    <Typography variant='body2' sx={{ mb: 2 }}>
                        Aktif olan ve modeli atanmış tüm şablonlar tek seferde ürünlere uygulanacak.
                        Bu işlem geri alınamaz.
                    </Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={applyAllOverride}
                                onChange={(e) => setApplyAllOverride(e.target.checked)}
                                disabled={applyAllLoading}
                            />
                        }
                        label='Mevcut açıklamaların üzerine yaz'
                    />
                    {applyAllOverride && (
                        <Typography variant='caption' sx={{ display: 'block', mt: 1 }}>
                            Ürünlerin mevcut açıklamaları silinip şablon içeriği yazılacak.
                        </Typography>
                    )}
                    {!applyAllOverride && (
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                            Sadece açıklaması olmayan ürünler güncellenecek.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApplyAllDialog(false)} disabled={applyAllLoading}>
                        Vazgeç
                    </Button>
                    <Button
                        variant='contained'
                        color='success'
                        onClick={handleApplyAll}
                        disabled={applyAllLoading}
                        startIcon={applyAllLoading ? <CircularProgress size={16} /> : <i className='ri-flashlight-line' />}
                    >
                        {applyAllLoading ? 'Uygulanıyor...' : 'Uygula'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    )
}

export default TemplatesListTable