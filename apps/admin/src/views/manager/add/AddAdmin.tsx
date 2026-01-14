'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'

// API
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type RoleType = {
    _id: string
    name: string
    description?: string
}

type AdminFormProps = {
    roles: RoleType[]
}

const AdminForm = ({ roles }: AdminFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        status: 'active' as const
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validasyonlar
        if (!formData.firstName.trim()) {
            toast.error('Lütfen ad alanını doldurun')
            return
        }

        if (!formData.lastName.trim()) {
            toast.error('Lütfen soyad alanını doldurun')
            return
        }

        if (!formData.username.trim()) {
            toast.error('Lütfen kullanıcı adını girin')
            return
        }

        if (!formData.email.trim()) {
            toast.error('Lütfen email alanını doldurun')
            return
        }

        // Email formatı kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            toast.error('Geçerli bir email adresi girin')
            return
        }

        if (!formData.password) {
            toast.error('Lütfen şifre girin')
            return
        }

        if (formData.password.length < 6) {
            toast.error('Şifre en az 6 karakter olmalıdır')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Şifreler eşleşmiyor')
            return
        }

        if (!formData.role) {
            toast.error('Lütfen bir rol seçin')
            return
        }

        setLoading(true)

        try {
            const { confirmPassword, ...dataToSend } = formData

            await fetchAPI(API_ENDPOINTS.admins.create(), {
                method: 'POST',
                body: JSON.stringify(dataToSend)
            })

            toast.success('Yönetici başarıyla oluşturuldu')
            setTimeout(() => {
                router.push('/apps/manager/list')
                router.refresh()
            }, 500)
        } catch (err: any) {
            toast.error(err.message || 'Yönetici oluşturulurken bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    if (!roles || roles.length === 0) {
        return (
            <Grid container spacing={6} className='flex items-center justify-center'>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Alert severity='warning'>
                                Hiç rol bulunamadı. Önce rol oluşturmalısınız.
                            </Alert>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Button
                                    variant='contained'
                                    onClick={() => router.push('/apps/manager/roles/add')}
                                >
                                    Rol Oluştur
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        )
    }

    return (
        <Grid container spacing={6} className='flex items-center justify-center'>
            <Grid item xs={12} md={8}>
                <Card>
                    <CardHeader
                        title='Yeni Yönetici Ekle'
                        subheader='Yönetici bilgilerini girin'
                    />
                    <CardContent>
                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={5}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label='Ad'
                                        placeholder='Adı girin'
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                        required
                                        disabled={loading}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label='Soyad'
                                        placeholder='Soyadı girin'
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        required
                                        disabled={loading}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label='Kullanıcı Adı'
                                        placeholder='Kullanıcı adını girin'
                                        value={formData.username}
                                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                        required
                                        disabled={loading}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type='email'
                                        label='Email'
                                        placeholder='email@ornek.com'
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                        disabled={loading}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type={showPassword ? 'text' : 'password'}
                                        label='Şifre'
                                        placeholder='******'
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        required
                                        disabled={loading}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position='end'>
                                                    <IconButton
                                                        edge='end'
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        disabled={loading}
                                                    >
                                                        <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type={showPassword ? 'text' : 'password'}
                                        label='Şifre Tekrar'
                                        placeholder='******'
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        required
                                        disabled={loading}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Rol</InputLabel>
                                        <Select
                                            value={formData.role}
                                            label='Rol'
                                            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                            disabled={loading}
                                        >
                                            {roles.map((role) => (
                                                <MenuItem key={role._id} value={role._id}>
                                                    {role.name}
                                                    {role.description && (
                                                        <span style={{ fontSize: '0.875rem', color: '#666', marginLeft: '8px' }}>
                                                            - {role.description}
                                                        </span>
                                                    )}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Durum</InputLabel>
                                        <Select
                                            value={formData.status}
                                            label='Durum'
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                            disabled={loading}
                                        >
                                            <MenuItem value='active'>Aktif</MenuItem>
                                            <MenuItem value='inactive'>Pasif</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
                                        <Button
                                            variant='contained'
                                            type='submit'
                                            disabled={loading}
                                            size='large'
                                            startIcon={loading ? <CircularProgress size={20} /> : null}
                                        >
                                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                                        </Button>
                                        <Button
                                            variant='outlined'
                                            color='secondary'
                                            onClick={() => router.push('/apps/manager/list')}
                                            disabled={loading}
                                            size='large'
                                        >
                                            İptal
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </form>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default AdminForm