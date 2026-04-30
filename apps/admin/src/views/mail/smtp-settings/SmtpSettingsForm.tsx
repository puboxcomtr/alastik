'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

/* MUI */
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'

/* API */
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

const MAIL_PROVIDERS = [
    { value: 'smtp', label: 'SMTP' },
    { value: 'mailgun', label: 'Mailgun' }
]

const SmtpSettingsForm = () => {
    const [host, setHost] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [port, setPort] = useState('587')
    const [provider, setProvider] = useState('smtp')
    const [senderEmail, setSenderEmail] = useState('')

    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    const [testDialogOpen, setTestDialogOpen] = useState(false)
    const [recipientEmail, setRecipientEmail] = useState('')

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.smtpSettings.get())

                if (res.success && res.data) {
                    setHost(res.data.host || '')
                    setUsername(res.data.username || '')
                    setPassword(res.data.password || '')
                    setPort(res.data.port?.toString() || '587')
                    setProvider(res.data.provider || 'smtp')
                    setSenderEmail(res.data.senderEmail || '')
                }
            } catch {
                toast.error('SMTP ayarları yüklenemedi')
            } finally {
                setLoading(false)
            }
        }

        loadSettings()
    }, [])

    const validateForm = () => {
        if (!host.trim()) {
            toast.error('SMTP Sunucu Adresi zorunludur')

            return false
        }

        if (!username.trim()) {
            toast.error('SMTP Kullanıcı Adı zorunludur')

            return false
        }

        if (!password.trim()) {
            toast.error('SMTP Şifre zorunludur')

            return false
        }

        if (!port.trim() || isNaN(Number(port))) {
            toast.error('Geçerli bir SMTP Port giriniz')

            return false
        }

        if (!provider) {
            toast.error('Mail Gönderim Sistemi seçilmelidir')

            return false
        }

        return true
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) return

        setSaving(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.smtpSettings.update(), {
                method: 'PATCH',
                body: JSON.stringify({
                    host: host.trim(),
                    username: username.trim(),
                    password: password.trim(),
                    port: Number(port),
                    provider,
                    senderEmail: senderEmail.trim()
                })
            })

            if (res.success) {
                toast.success(res.message || 'SMTP ayarları kaydedildi')
            } else {
                toast.error(res.message || 'Kayıt başarısız')
            }
        } catch {
            toast.error('Kayıt sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const openTestDialog = () => {
        if (!validateForm()) return

        setRecipientEmail(senderEmail.trim() || username.trim() || '')
        setTestDialogOpen(true)
    }

    const closeTestDialog = () => {
        if (testing) return
        setTestDialogOpen(false)
    }

    const handleTestMail = async () => {
        const trimmedRecipient = recipientEmail.trim()

        if (!trimmedRecipient) {
            toast.error('Alıcı mail adresi zorunludur')

            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailRegex.test(trimmedRecipient)) {
            toast.error('Geçerli bir mail adresi giriniz')

            return
        }

        setTesting(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.smtpSettings.test(), {
                method: 'POST',
                body: JSON.stringify({
                    host: host.trim(),
                    username: username.trim(),
                    password: password.trim(),
                    port: Number(port),
                    provider,
                    senderEmail: senderEmail.trim(),
                    recipientEmail: trimmedRecipient
                })
            })

            if (res.success) {
                toast.success(res.message || 'Test maili başarıyla gönderildi')
                setTestDialogOpen(false)
            } else {
                toast.error(res.message || 'Test maili gönderilemedi')
            }
        } catch {
            toast.error('Test maili gönderim sırasında hata oluştu')
        } finally {
            setTesting(false)
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography>SMTP ayarları yükleniyor...</Typography>
            </Box>
        )
    }

    return (
        <>
            <form onSubmit={handleSave}>
                <Grid container spacing={6} justifyContent='center'>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card>
                            <CardHeader
                                title='SMTP Bağlantı Bilgileri'
                                action={
                                    <div className='flex gap-4'>
                                        <Button
                                            variant='outlined'
                                            color='secondary'
                                            onClick={openTestDialog}
                                            disabled={testing || saving}
                                            startIcon={<i className='ri-mail-send-line' />}
                                        >
                                            Test Maili Gönder
                                        </Button>
                                        <Button type='submit' variant='contained' disabled={saving || testing}>
                                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                        </Button>
                                    </div>
                                }
                            />
                            <Divider />
                            <CardContent>
                                <Grid container spacing={5}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth
                                            label='SMTP Sunucu Adresi'
                                            placeholder='mail.alastik.com'
                                            value={host}
                                            onChange={(e) => setHost(e.target.value)}
                                            required
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth
                                            label='SMTP Kullanıcı Adı'
                                            placeholder='noreply@alastik.com'
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth
                                            type={showPassword ? 'text' : 'password'}
                                            label='SMTP Şifre'
                                            placeholder='••••••••'
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position='end'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            edge='end'
                                                        >
                                                            <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                        </IconButton>
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth
                                            type='number'
                                            label='SMTP Port'
                                            placeholder='587'
                                            value={port}
                                            onChange={(e) => setPort(e.target.value)}
                                            required
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            select
                                            fullWidth
                                            label='Mail Gönderim Sistemi'
                                            value={provider}
                                            onChange={(e) => setProvider(e.target.value)}
                                            required
                                        >
                                            {MAIL_PROVIDERS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth
                                            type='email'
                                            label='SMTP Gönderici Mail'
                                            placeholder='noreply@alastik.com'
                                            value={senderEmail}
                                            onChange={(e) => setSenderEmail(e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </form>

            <Dialog open={testDialogOpen} onClose={closeTestDialog} maxWidth='sm' fullWidth>
                <DialogTitle>Test Maili Gönder</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 3 }}>
                        Test mailinin gönderileceği alıcı adresini giriniz. Mevcut SMTP ayarlarıyla bağlantı denenip
                        bu adrese örnek bir mail gönderilecek.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        type='email'
                        label='Alıcı Mail Adresi'
                        placeholder='ornek@alastik.com'
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        disabled={testing}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !testing) {
                                e.preventDefault()
                                handleTestMail()
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={closeTestDialog} disabled={testing} color='secondary'>
                        Vazgeç
                    </Button>
                    <Button
                        onClick={handleTestMail}
                        variant='contained'
                        disabled={testing}
                        startIcon={testing ? <CircularProgress size={16} color='inherit' /> : <i className='ri-mail-send-line' />}
                    >
                        {testing ? 'Gönderiliyor...' : 'Gönder'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default SmtpSettingsForm