/**
  admin/src/views/modules/xmlListTable/XmlAddModal.tsx
 */

'use client'

import { useState } from 'react'
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
    Divider,
    FormControlLabel,
    Switch,
    MenuItem
} from '@mui/material'
import { toast } from 'react-toastify'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type FormData = {
    name: string
    format: 'xml' | 'json' | 'csv'
    apiUrl: string
    isActive: boolean
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
    onSuccess: () => void
}

const defaultForm: FormData = {
    name: '',
    format: 'xml',
    apiUrl: '',
    isActive: false,
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
}

const XmlAddModal = ({ open, onClose, onSuccess }: Props) => {
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<FormData>(defaultForm)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [showSecrets, setShowSecrets] = useState({
        apiKey: false,
        appKey: false,
        secretKey: false,
        token: false,
        password: false
    })

    const handleChange = (field: string, value: string | number | boolean) => {
        if (field.startsWith('credentials.')) {
            const credField = field.replace('credentials.', '')
            setFormData(prev => ({
                ...prev,
                credentials: { ...prev.credentials, [credField]: value }
            }))
        } else {
            setFormData(prev => ({ ...prev, [field]: value }))
        }
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const toggleShowSecret = (field: keyof typeof showSecrets) => {
        setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Kaynak adı zorunludur'
        }

        if (!formData.apiUrl.trim()) {
            newErrors.apiUrl = 'URL zorunludur'
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
            const payload: Record<string, any> = {
                name: formData.name,
                format: formData.format,
                apiUrl: formData.apiUrl,
                isActive: formData.isActive
            }

            payload.syncInterval = formData.syncInterval
            if (formData.format === 'json') {
                payload.credentials = formData.credentials
            }

            const response = await fetchAPI(API_ENDPOINTS.webxml.create(), {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            if (response.success) {
                toast.success('Entegrasyon eklendi')
                setFormData(defaultForm)
                setErrors({})
                onSuccess()
                onClose()
            } else {
                toast.error(response.message || 'Ekleme başarısız')
            }
        } catch (error) {
            toast.error('Ekleme sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        if (!saving) {
            setFormData(defaultForm)
            setErrors({})
            onClose()
        }
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { minHeight: '300px' } }}
        >
            <DialogTitle>
                <div className="flex items-center justify-between">
                    <Typography variant="h6">XML Entegrasyon Ekle</Typography>
                    <IconButton onClick={handleClose} size="small" disabled={saving}>
                        <i className="ri-close-line" />
                    </IconButton>
                </div>
            </DialogTitle>

            <Divider />

            <DialogContent>
                <Grid container spacing={3} sx={{ mt: 0 }}>
                    {/* Temel Bilgiler */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Temel Bilgiler
                        </Typography>
                    </Grid>


                    <Grid className='mb-3' item xs={12} sm={12}>
                        <TextField
                            select
                            fullWidth
                            label="Format"
                            value={formData.format}
                            onChange={(e) => handleChange('format', e.target.value)}
                            size="small"
                        >
                            <MenuItem value="xml">XML</MenuItem>
                            <MenuItem value="json">API (JSON)</MenuItem>
                            <MenuItem value="csv">CSV</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid className='mb-3' item xs={12} sm={12}>
                        <TextField
                            fullWidth
                            label="Kaynak Adı"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            error={!!errors.name}
                            size="small"
                            placeholder="Örn: USPA, Mollaoglu"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="URL"
                            value={formData.apiUrl}
                            onChange={(e) => handleChange('apiUrl', e.target.value)}
                            error={!!errors.apiUrl}
                            helperText={errors.apiUrl}
                            size="small"
                            placeholder="https://ornek.com/stok.xml"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isActive}
                                    onChange={(e) => handleChange('isActive', e.target.checked)}
                                    size="small"
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    {formData.isActive ? 'Aktif' : 'Pasif'}
                                </Typography>
                            }
                        />
                    </Grid>

                    {/* Senkronizasyon süresi — her format için */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                            Senkronizasyon Ayarları
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={12}>
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

                    {/* API (JSON) seçilince ek alanlar */}
                    {formData.format === 'json' && (
                        <>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                                    Kimlik Bilgileri
                                </Typography>
                            </Grid>

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
                                    type={showSecrets.password ? 'text' : 'password'}
                                    value={formData.credentials.password}
                                    onChange={(e) => handleChange('credentials.password', e.target.value)}
                                    size="small"
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => toggleShowSecret('password')} edge="end" size="small">
                                                    <i className={showSecrets.password ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Grid>

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

                            <Grid item xs={12} sm={12}>
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

                            <Grid item xs={12} sm={12}>
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

                            <Grid item xs={12} sm={12}>
                                <TextField
                                    fullWidth
                                    label="Firma Kodu"
                                    value={formData.credentials.companyCode}
                                    onChange={(e) => handleChange('credentials.companyCode', e.target.value)}
                                    size="small"
                                />
                            </Grid>

                        </>
                    )}
                </Grid>
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 3 }}>
                <Button onClick={handleClose} disabled={saving} color="secondary">
                    İptal
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving && <CircularProgress size={16} color="inherit" />}
                >
                    {saving ? 'Kaydediliyor...' : 'Ekle'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default XmlAddModal