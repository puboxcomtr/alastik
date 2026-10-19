'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type Props = {
    accountId: string
}

const MailAccountEditForm = ({ accountId }: Props) => {
    const router = useRouter()
    const { lang: locale } = useParams()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [createdAt, setCreatedAt] = useState<string | null>(null)
    const [updatedAt, setUpdatedAt] = useState<string | null>(null)

    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadAccount = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.mailAccounts.detail(accountId))

                if (res.success) {
                    setEmail(res.data.email || '')
                    setPassword(res.data.password || '')
                    setIsActive(res.data.isActive !== false)
                    setCreatedAt(res.data.createdAt || null)
                    setUpdatedAt(res.data.updatedAt || null)
                } else {
                    toast.error('Mail hesabı bulunamadı')
                    router.push(`/${locale}/apps/mail/accounts`)
                }
            } catch {
                toast.error('Mail hesabı yüklenemedi')
            } finally {
                setLoading(false)
            }
        }

        loadAccount()
    }, [accountId])

    const formatDate = (date: string | null) => {
        if (!date) return '-'

        return new Date(date).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email.trim()) {
            toast.error('Email hesabı zorunludur')

            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailRegex.test(email)) {
            toast.error('Geçerli bir email adresi giriniz')

            return
        }

        if (!password.trim()) {
            toast.error('Şifre zorunludur')

            return
        }

        setSaving(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.mailAccounts.update(accountId), {
                method: 'PATCH',
                body: JSON.stringify({
                    email: email.trim(),
                    password: password.trim(),
                    isActive
                })
            })

            if (res.success) {
                toast.success('Mail hesabı güncellendi')
                setUpdatedAt(new Date().toISOString())
            } else {
                toast.error(res.message || 'Güncelleme başarısız')
            }
        } catch {
            toast.error('Güncelleme sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography>Mail hesabı yükleniyor...</Typography>
            </Box>
        )
    }

    return (
        <form onSubmit={handleSave}>
            <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-y-4'>
                        <Typography variant='h4'>Mail Hesabını Düzenle</Typography>
                        <div className='flex gap-4'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.push(`/${locale}/apps/mail/accounts`)}
                                disabled={saving}
                            >
                                İptal
                            </Button>
                            <Button type='submit' variant='contained' disabled={saving}>
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                        </div>
                    </div>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Card>
                        <CardHeader title='Hesap Bilgileri' />
                        <Divider />
                        <CardContent>
                            <Grid container spacing={5}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        type='email'
                                        label='Email Hesabı'
                                        placeholder='ornek@alastik.com'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        type={showPassword ? 'text' : 'password'}
                                        label='Şifre'
                                        placeholder='Hesap şifresi'
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
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader title='Ayarlar' />
                                <Divider />
                                <CardContent>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                            />
                                        }
                                        label='Aktif'
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader title='Log Bilgileri' />
                                <Divider />
                                <CardContent>
                                    <Grid container spacing={4}>
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant='caption' color='text.secondary'>
                                                Eklenme Tarihi
                                            </Typography>
                                            <Typography variant='body2'>{formatDate(createdAt)}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant='caption' color='text.secondary'>
                                                Düzenlenme Tarihi
                                            </Typography>
                                            <Typography variant='body2'>{formatDate(updatedAt)}</Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default MailAccountEditForm