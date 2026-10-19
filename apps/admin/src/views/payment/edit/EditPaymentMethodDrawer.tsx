'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'

import { toast } from 'react-toastify'

import { fetchAPI } from '@libs/api'

import type {
    PaymentMethod,
    PaymentMethodFormData,
    PaymentMethodResponse
} from '@/types/apps/paymentTypes'

import {
    PAYMENT_MODES,
    API_ENDPOINTS,
    TOAST_MESSAGES
} from '@/constants/paymentStatus'

type Props = {
    open: boolean
    handleClose: () => void
    onSuccess: () => void
    method: PaymentMethod | null
}

const EditPaymentMethodDrawer = ({ open, handleClose, onSuccess, method }: Props) => {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<PaymentMethodFormData>({
        name: '',
        description: '',
        priority: 0,
        apiCredentials: {},
        mode: 'test'
    })
    const [providers, setProviders] = useState<Record<string, Record<string, { requiredFields?: { key: string; label: string; type?: string; help?: string }[] }>> | null>(null)
    const [tekCekim, setTekCekim] = useState(false)
    const [taksit, setTaksit] = useState(false)

    useEffect(() => {
        if (method) {
            setFormData({
                name: method.name,
                description: method.description || '',
                priority: method.priority,
                apiCredentials: method.apiCredentials || {},
                mode: method.creditCardSettings?.mode || 'test'
            })
            setTekCekim(method.creditCardSettings?.tekCekimAktif === true)
            setTaksit(method.creditCardSettings?.taksitAktif === true)
        }
    }, [method])

    useEffect(() => {
        if (open && !providers) {
            (async () => {
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
                    const result = await fetchAPI(`${baseUrl}${API_ENDPOINTS.PROVIDERS}`)
                    if (result.success) setProviders(result.data)
                } catch (error) {
                    console.error('Ödeme sağlayıcı şablonu yüklenemedi:', error)
                }
            })()
        }
    }, [open, providers])

    const handleCredentialChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            apiCredentials: {
                ...prev.apiCredentials,
                [key]: value
            }
        }))
    }

    const validateForm = (): boolean => {
        if (!formData.name.trim()) {
            toast.error(TOAST_MESSAGES.ENTER_NAME)
            return false
        }

        return true
    }

    const onSubmit = async () => {
        if (!validateForm() || isLoading || !method) return
        setIsLoading(true)

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
            const payload: any = {
                name: formData.name,
                description: formData.description,
                priority: formData.priority,
                apiCredentials: formData.apiCredentials
            }

            if (method.type === 'credit_card') {
                payload.creditCardSettings = {
                    ...method.creditCardSettings,
                    mode: formData.mode,
                    tekCekimAktif: tekCekim,
                    taksitAktif: taksit
                }
            }
            if (method.type === 'bank_transfer') {
                payload.bankTransferSettings = {
                    accountName: formData.apiCredentials.accountName,
                    accountNumber: formData.apiCredentials.accountNumber,
                    branchName: formData.apiCredentials.branchName,
                    branchCode: formData.apiCredentials.branchCode,
                    iban: formData.apiCredentials.iban,
                    swift: formData.apiCredentials.swift
                }
            }
            const result: PaymentMethodResponse = await fetchAPI(`${baseUrl}${API_ENDPOINTS.BASE}/${method._id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            })

            if (result.success) {
                toast.success('Ödeme yöntemi güncellendi', {
                    position: 'top-right',
                    autoClose: 3000
                })

                onSuccess()
                handleClose()
            } else {
                toast.error(TOAST_MESSAGES.ERROR(result.message || 'Ödeme yöntemi güncellenemedi'))
            }
        } catch (error) {
            console.error('API hatası:', error)
            const msg = error instanceof Error && error.message ? error.message : TOAST_MESSAGES.CONNECTION_ERROR
            toast.error(msg)
            if (method) {
                setTekCekim(method.creditCardSettings?.tekCekimAktif === true)
                setTaksit(method.creditCardSettings?.taksitAktif === true)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleDiscard = () => {
        handleClose()
    }

    if (!method) return null

    const typeLabels = {
        credit_card: 'Kredi Kartı',
        bank_transfer: 'Banka Havalesi'
    }
    const getProviderFields = () => {
        const humanize = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')

        const template = providers?.[method!.type]?.[method!.provider]?.requiredFields || []
        const fields = template.map(f => ({
            key: f.key,
            label: f.label || humanize(f.key),
            type: f.type || (f.key.toLowerCase().includes('password') ? 'password' : 'text'),
            help: f.help
        }))

        const known = new Set(fields.map(f => f.key))
        Object.keys(formData.apiCredentials).forEach(key => {
            if (!known.has(key)) {
                fields.push({
                    key,
                    label: humanize(key),
                    type: key.toLowerCase().includes('password') ? 'password' : 'text',
                    help: undefined
                })
            }
        })
        return fields
    }

    return (
        <Drawer
            open={open}
            anchor='right'
            variant='temporary'
            onClose={handleDiscard}
            ModalProps={{ keepMounted: true }}
            sx={{
                '& .MuiDrawer-paper': {
                    width: { xs: 300, sm: 500 },
                    zIndex: 1200
                }
            }}
        >
            <div className='flex items-center justify-between pli-5 plb-4'>
                <Typography variant='h5'>Ödeme Yöntemi Düzenle</Typography>
                <IconButton size='small' onClick={handleDiscard}>
                    <i className='ri-close-line text-2xl' />
                </IconButton>
            </div>
            <Divider />

            <div className='p-5'>
                <form
                    onSubmit={e => {
                        e.preventDefault()
                        onSubmit()
                    }}
                    className='flex flex-col gap-5'
                >
                    <TextField
                        fullWidth
                        label='Ödeme Yöntemi Adı'
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={`Örn: ${method.providerMeta.displayName} - Ana Hesap`}
                        disabled={isLoading}
                        required
                    />

                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label='Açıklama'
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder='Ödeme yöntemi açıklaması (opsiyonel)'
                        disabled={isLoading}
                    />

                    <TextField
                        fullWidth
                        type='number'
                        label='Öncelik'
                        value={formData.priority}
                        onChange={e => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                        placeholder='Sıralama önceliği (0-999)'
                        disabled={isLoading}
                        helperText='Düşük sayı = Önce görünür'
                    />

                    {method.type === 'credit_card' && (
                        <FormControl fullWidth>
                            <InputLabel>Mod</InputLabel>
                            <Select
                                value={formData.mode}
                                label='Mod'
                                onChange={e => setFormData(prev => ({ ...prev, mode: e.target.value as 'test' | 'live' }))}
                                disabled={isLoading}
                            >
                                <MenuItem value={PAYMENT_MODES.TEST}>
                                    <Chip label='Test' color='warning' size='small' sx={{ mr: 2 }} />
                                    Test Modu
                                </MenuItem>
                                <MenuItem value={PAYMENT_MODES.LIVE}>
                                    <Chip label='Canlı' color='success' size='small' sx={{ mr: 2 }} />
                                    Canlı Mod
                                </MenuItem>
                            </Select>
                            <FormHelperText>Test modunda gerçek para çekilmez</FormHelperText>
                        </FormControl>
                    )}

                    {method.type === 'credit_card' && (
                        <FormControl fullWidth>
                            <FormControlLabel
                                control={<Switch checked={tekCekim} onChange={e => setTekCekim(e.target.checked)} disabled={isLoading} />}
                                label='Tek Çekim için Aktifleştir'
                            />
                            <FormControlLabel
                                control={<Switch checked={taksit} onChange={e => setTaksit(e.target.checked)} disabled={isLoading} />}
                                label='Taksitli için Aktifleştir'
                            />
                        </FormControl>
                    )}

                    <Divider>
                        <Chip label='API / Hesap Bilgileri' size='small' />
                    </Divider>

                    {getProviderFields().map(field => (
                        <TextField
                            key={field.key}
                            fullWidth
                            type={field.type}
                            label={field.label}
                            value={formData.apiCredentials[field.key] || ''}
                            onChange={e => handleCredentialChange(field.key, e.target.value)}
                            disabled={isLoading}
                            helperText={field.help || undefined}
                        />
                    ))}

                    <div className='flex items-center gap-4 justify-end'>
                        <Button variant='outlined' color='error' onClick={handleDiscard} disabled={isLoading}>
                            Vazgeç
                        </Button>
                        <Button variant='contained' type='submit' disabled={isLoading}>
                            {isLoading ? 'Güncelleniyor...' : 'Güncelle'}
                        </Button>
                    </div>
                </form>
            </div>
        </Drawer>
    )
}

export default EditPaymentMethodDrawer