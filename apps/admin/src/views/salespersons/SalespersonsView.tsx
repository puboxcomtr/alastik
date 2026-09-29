'use client'

// Plasiyerler (satış personeli) — DIA sis_kullanici kaynaklı liste.
// Senkron adayları getirir; admin şifre atar. Kural basit: şifresi olan giriş yapar.
import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { getActiveSite } from '@/utils/activeSite'

import tableStyles from '@core/styles/table.module.css'

type Salesperson = {
    _id: string
    diaUsername?: string
    name?: string
    email?: string
    phone?: string
    diaTitle?: string
    hasPassword?: boolean
    lastLoginAt?: string
    createdAt?: string
}

// Türkçe uyumlu baş harf büyük (EMİR BAHÇECİOĞLU → Emir Bahçecioğlu)
const titleCaseTr = (value?: string) => {
    if (!value) return '-'

    return value
        .toLocaleLowerCase('tr')
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1))
        .join(' ')
}

const formatDateTime = (value?: string) => {
    if (!value) return '-'
    const d = new Date(value)
    if (isNaN(d.getTime())) return '-'

    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d)
}

const SalespersonsView = () => {
    const [site, setSite] = useState('')
    const [data, setData] = useState<Salesperson[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [search, setSearch] = useState('')

    // Şifre belirleme dialog'u
    const [editing, setEditing] = useState<Salesperson | null>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setSite(getActiveSite())
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.salespersons.list({ search, limit: 500 }))
            setData(res?.data || [])
        } catch (err: any) {
            toast.error(err?.message || 'Plasiyerler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => {
        const t = setTimeout(load, 300)

        return () => clearTimeout(t)
    }, [load])

    const handleSync = async () => {
        setSyncing(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.salespersons.syncDia(), { method: 'POST' })
            toast.success(res?.message || 'Plasiyer senkronu tamamlandı')
            await load()
        } catch (err: any) {
            toast.error(err?.message || 'Plasiyer senkronu başarısız')
        } finally {
            setSyncing(false)
        }
    }

    const openEdit = async (sp: Salesperson) => {
        setEditing(sp)
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        // Mevcut şifreyi getir (admin sonradan görebilsin)
        if (sp.hasPassword) {
            try {
                const res = await fetchAPI(API_ENDPOINTS.salespersons.password(sp._id))
                if (res?.data?.password) {
                    setPassword(res.data.password)
                    setConfirmPassword(res.data.password)
                }
            } catch {
                // şifre alınamazsa boş bırak
            }
        }
    }

    const copyPassword = async () => {
        if (!password) return
        try {
            await navigator.clipboard.writeText(password)
            toast.success('Şifre kopyalandı')
        } catch {
            toast.error('Şifre kopyalanamadı')
        }
    }

    const saveEdit = async () => {
        if (!editing) return
        if (!password.trim()) {
            toast.error('Şifre giriniz')

            return
        }
        if (password.trim().length < 6) {
            toast.error('Şifre en az 6 karakter olmalıdır')

            return
        }
        if (password !== confirmPassword) {
            toast.error('Şifreler eşleşmiyor')

            return
        }
        setSaving(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.salespersons.update(editing._id), {
                method: 'PUT',
                body: JSON.stringify({ password: password.trim() })
            })
            toast.success(res?.message || 'Plasiyer şifresi güncellendi')
            setEditing(null)
            await load()
        } catch (err: any) {
            toast.error(err?.message || 'Plasiyer güncellenemedi')
        } finally {
            setSaving(false)
        }
    }

    if (site && site !== 'b2b') {
        return (
            <Card>
                <CardHeader title='Plesiyerler' />
                <div className='p-6'>
                    <Typography color='text.secondary'>
                        Plasiyer yönetimi yalnız B2B Toptan sitesi için kullanılabilir. Lütfen üstteki site seçiciden B2B'yi seçin.
                    </Typography>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title='Plesiyerler'
                subheader='DIA satış personeli — senkronla getir, şifre ata (şifresi olan giriş yapar)'
                action={
                    <Button
                        variant='contained'
                        onClick={handleSync}
                        disabled={syncing}
                        startIcon={syncing ? <CircularProgress size={18} color='inherit' /> : <i className='ri-refresh-line' />}
                    >
                        {syncing ? 'Senkronize Ediliyor...' : 'Plasiyerleri Senkronize Et'}
                    </Button>
                }
            />

            <div className='flex flex-wrap items-center gap-4 p-6 pbs-0'>
                <TextField
                    size='small'
                    placeholder='Kullanıcı kodu, ad, e-posta ara...'
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className='min-is-[280px]'
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position='start'>
                                <i className='ri-search-line' />
                            </InputAdornment>
                        )
                    }}
                />
                <Typography variant='body2' color='text.secondary' className='mis-auto'>
                    {data.length} plasiyer
                </Typography>
            </div>

            <div className='overflow-x-auto'>
                {loading ? (
                    <div className='flex justify-center p-10'>
                        <CircularProgress size={24} />
                    </div>
                ) : (
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th>Kullanıcı Kodu</th>
                                <th>Ad Soyad</th>
                                <th>Şifre</th>
                                <th>Son Giriş</th>
                                <th>Oluşturulma</th>
                                <th className='text-right'>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className='border-be'>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className='text-center p-6'>
                                        <Typography color='text.secondary'>
                                            Plasiyer bulunamadı. "Plasiyerleri Senkronize Et" ile DIA'dan çekebilirsiniz.
                                        </Typography>
                                    </td>
                                </tr>
                            ) : (
                                data.map(sp => (
                                    <tr key={sp._id}>
                                        <td>
                                            <Typography className='font-medium' color='text.primary'>
                                                {sp.diaUsername || '-'}
                                            </Typography>
                                        </td>
                                        <td>
                                            <Typography>{titleCaseTr(sp.name)}</Typography>
                                        </td>
                                        <td>
                                            {sp.hasPassword ? (
                                                <Chip size='small' label='Atandı' color='success' variant='tonal' />
                                            ) : (
                                                <Chip size='small' label='Yok' color='default' variant='outlined' />
                                            )}
                                        </td>
                                        <td>
                                            <Typography variant='body2' color='text.secondary'>{formatDateTime(sp.lastLoginAt)}</Typography>
                                        </td>
                                        <td>
                                            <Typography variant='body2' color='text.secondary'>{formatDateTime(sp.createdAt)}</Typography>
                                        </td>
                                        <td className='text-right'>
                                            <Tooltip title='Şifre Belirle / Değiştir'>
                                                <IconButton size='small' onClick={() => openEdit(sp)}>
                                                    <i className='ri-key-2-line' />
                                                </IconButton>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth='xs'>
                <DialogTitle>Plasiyer: {titleCaseTr(editing?.name) !== '-' ? titleCaseTr(editing?.name) : editing?.diaUsername}</DialogTitle>
                <DialogContent className='flex flex-col gap-4 pbs-2'>
                    <TextField
                        type={showPassword ? 'text' : 'password'}
                        label={editing?.hasPassword ? 'Şifre' : 'Şifre Belirle'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        fullWidth
                        autoComplete='new-password'
                        helperText='En az 6 karakter. Şifresi atanan plasiyer giriş yapabilir.'
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <Tooltip title={showPassword ? 'Gizle' : 'Göster'}>
                                        <IconButton size='small' edge='end' onClick={() => setShowPassword(s => !s)}>
                                            <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title='Kopyala'>
                                        <span>
                                            <IconButton size='small' edge='end' onClick={copyPassword} disabled={!password}>
                                                <i className='ri-file-copy-line' />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </InputAdornment>
                            )
                        }}
                    />
                    <TextField
                        type={showPassword ? 'text' : 'password'}
                        label='Şifre Tekrar'
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        fullWidth
                        autoComplete='new-password'
                        error={!!confirmPassword && confirmPassword !== password}
                        helperText={!!confirmPassword && confirmPassword !== password ? 'Şifreler eşleşmiyor' : ' '}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditing(null)} color='secondary'>Vazgeç</Button>
                    <Button onClick={saveEdit} variant='contained' disabled={saving}>
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    )
}

export default SalespersonsView
