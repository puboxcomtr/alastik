/**
 * XML Entegrasyon Düzenleme Modalı
 * Dosya: admin/src/views/modules/xmlListTable/XmlEditModal.tsx
 */

'use client'

import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    IconButton,
    InputAdornment,
    CircularProgress,
    Divider
} from '@mui/material'
import { toast } from 'react-toastify'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type XmlIntegrationDetail = {
    id: string
    name: string
    code: string
    apiUrl: string
    credentials: {
        apiKey: string
        appKey: string
        secretKey: string
        token: string
        userName: string
        password: string
        companyCode: string
    }
    syncInterval: number
}

type Props = {
    open: boolean
    onClose: () => void
    integrationId: string | null
    onSuccess: () => void
}

const XmlEditModal = ({ open, onClose, integrationId, onSuccess }: Props) => {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showSecrets, setShowSecrets] = useState({
        apiKey: false,
        appKey: false,
        secretKey: false,
        token: false
    })

    const [formData, setFormData] = useState<XmlIntegrationDetail>({
        id: '',
        name: '',
        code: '',
        apiUrl: '',
        credentials: {
            apiKey: '',
            appKey: '',
            secretKey: '',
            token: '',
            userName: '',
            password: '',
            companyCode: ''
        },
        syncInterval: 180
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    // Veriyi yükle
    useEffect(() => {
        if (open && integrationId) {
            loadIntegration()
        }
    }, [open, integrationId])

    const loadIntegration = async () => {
        if (!integrationId) return

        setLoading(true)
        try {
            const response = await fetchAPI(API_ENDPOINTS.webxml.detail(integrationId))

            if (response.success) {
                const data = response.data
                setFormData({
                    id: data.id,
                    name: data.name || '',
                    code: data.code || '',
                    apiUrl: data.apiUrl || '',
                    credentials: {
                        apiKey: data.credentials?.apiKey || '',
                        appKey: data.credentials?.appKey || '',
                        secretKey: data.credentials?.secretKey || '',
                        token: data.credentials?.token || '',
                        userName: data.credentials?.userName || '',
                        password: data.credentials?.password || '',
                        companyCode: data.credentials?.companyCode || ''
                    },
                    syncInterval: data.syncInterval || 180
                })
            } else {
                toast.error('Entegrasyon bilgileri yüklenemedi')
                onClose()
            }
        } catch (error) {
            console.error('Load integration error:', error)
            toast.error('Entegrasyon bilgileri yüklenirken hata oluştu')
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: string, value: string | number) => {
        if (field.startsWith('credentials.')) {
            const credField = field.replace('credentials.', '')
            setFormData(prev => ({
                ...prev,
                credentials: {
                    ...prev.credentials,
                    [credField]: value
                }
            }))
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }))
        }

        // Hata temizle
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Entegrasyon adı zorunludur'
        }

        if (!formData.code.trim()) {
            newErrors.code = 'Kod zorunludur'
        } else if (!/^[a-z0-9_-]+$/.test(formData.code)) {
            newErrors.code = 'Kod sadece küçük harf, rakam, tire ve alt çizgi içerebilir'
        }

        if (!formData.apiUrl.trim()) {
            newErrors.apiUrl = 'API URL zorunludur'
        } else if (!formData.apiUrl.startsWith('http')) {
            newErrors.apiUrl = 'Geçerli bir URL giriniz'
        }

        if (formData.syncInterval < 15 || formData.syncInterval > 900) {
            newErrors.syncInterval = 'Yenileme sıklığı 15-900 dakika arasında olmalıdır'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return

        setSaving(true)
        try {
            const response = await fetchAPI(API_ENDPOINTS.webxml.update(formData.id), {
                method: 'PUT',
                body: JSON.stringify({
                    name: formData.name,
                    apiUrl: formData.apiUrl,
                    credentials: formData.credentials,
                    syncInterval: formData.syncInterval
                })
            })

            if (response.success) {
                toast.success('Entegrasyon güncellendi')
                onSuccess()
                onClose()
            } else {
                toast.error(response.message || 'Güncelleme başarısız')
            }
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Güncelleme sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        if (!saving) {
            setErrors({})
            onClose()
        }
    }

    const toggleShowSecret = (field: keyof typeof showSecrets) => {
        setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { minHeight: '400px' } }}
        >
            <DialogTitle>
                <div className="flex items-center justify-between">
                    <Typography variant="h6">API Ayarları</Typography>
                    <IconButton onClick={handleClose} size="small" disabled={saving}>
                        <i className="ri-close-line" />
                    </IconButton>
                </div>
            </DialogTitle>

            <Divider />

            <DialogContent>
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <CircularProgress size={32} />
                        <Typography sx={{ ml: 2 }}>Yükleniyor...</Typography>
                    </div>
                ) : (
                    <Grid container spacing={3} sx={{ mt: 0 }}>
                        {/* Temel Bilgiler */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                Temel Bilgiler
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Entegrasyon Adı"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                size="small"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Kod"
                                value={formData.code}
                                disabled
                                size="small"
                                helperText="Kod değiştirilemez"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="API URL"
                                value={formData.apiUrl}
                                onChange={(e) => handleChange('apiUrl', e.target.value)}
                                error={!!errors.apiUrl}
                                helperText={errors.apiUrl}
                                size="small"
                                placeholder="https://api.example.com/products"
                            />
                        </Grid>

                        {/* Credentials */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, mt: 2 }}>
                                Kimlik Bilgileri
                            </Typography>
                        </Grid>

                        {formData.code === 'tatko' ? (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Kullanıcı Adı"
                                        value={formData.credentials.userName}
                                        onChange={(e) => handleChange('credentials.userName', e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Şifre"
                                        type={showSecrets.appKey ? 'text' : 'password'}
                                        value={formData.credentials.password}
                                        onChange={(e) => handleChange('credentials.password', e.target.value)}
                                        size="small"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => toggleShowSecret('appKey')} edge="end" size="small">
                                                        <i className={showSecrets.appKey ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Firma Kodu"
                                        value={formData.credentials.companyCode}
                                        onChange={(e) => handleChange('credentials.companyCode', e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                            </>
                        ) : (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="API-KEY"
                                        type={showSecrets.apiKey ? 'text' : 'password'}
                                        value={formData.credentials.apiKey}
                                        onChange={(e) => handleChange('credentials.apiKey', e.target.value)}
                                        size="small"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => toggleShowSecret('apiKey')} edge="end" size="small">
                                                        <i className={showSecrets.apiKey ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="APP-KEY"
                                        type={showSecrets.appKey ? 'text' : 'password'}
                                        value={formData.credentials.appKey}
                                        onChange={(e) => handleChange('credentials.appKey', e.target.value)}
                                        size="small"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => toggleShowSecret('appKey')} edge="end" size="small">
                                                        <i className={showSecrets.appKey ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="SECRET-KEY"
                                        type={showSecrets.secretKey ? 'text' : 'password'}
                                        value={formData.credentials.secretKey}
                                        onChange={(e) => handleChange('credentials.secretKey', e.target.value)}
                                        size="small"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => toggleShowSecret('secretKey')} edge="end" size="small">
                                                        <i className={showSecrets.secretKey ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Token"
                                        type={showSecrets.token ? 'text' : 'password'}
                                        value={formData.credentials.token}
                                        onChange={(e) => handleChange('credentials.token', e.target.value)}
                                        size="small"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => toggleShowSecret('token')} edge="end" size="small">
                                                        <i className={showSecrets.token ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                            </>
                        )}

                        {/* Ayarlar */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, mt: 2 }}>
                                Senkronizasyon Ayarları
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Yenileme Sıklığı (dakika)"
                                type="number"
                                value={formData.syncInterval}
                                onChange={(e) => handleChange('syncInterval', parseInt(e.target.value) || 15)}
                                error={!!errors.syncInterval}
                                helperText={errors.syncInterval || 'Min: 15, Max: 900 dakika'}
                                size="small"
                                inputProps={{ min: 15, max: 900 }}
                            />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 3 }}>
                <Button
                    onClick={handleClose}
                    disabled={saving}
                    color="secondary"
                >
                    İptal
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading || saving}
                    startIcon={saving && <CircularProgress size={16} color="inherit" />}
                >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default XmlEditModal