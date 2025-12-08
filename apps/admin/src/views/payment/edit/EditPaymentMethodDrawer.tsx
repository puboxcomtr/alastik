'use client'

import { useEffect, useState } from 'react'

// MUI Imports
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
import FormHelperText from '@mui/material/FormHelperText'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'

// Toast
import { toast } from 'react-toastify'

// Types
import type {
    PaymentMethod,
    PaymentMethodFormData,
    PaymentMethodResponse
} from '@/types/apps/paymentTypes'

// Constants
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
    useEffect(() => {
        if (method) {
            setFormData({
                name: method.name,
                description: method.description || '',
                priority: method.priority,
                apiCredentials: method.apiCredentials || {},
                mode: method.creditCardSettings?.mode || 'test'
            })
        }
    }, [method])

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
                    mode: formData.mode
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
            const response = await fetch(`${baseUrl}${API_ENDPOINTS.BASE}/${method._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const result: PaymentMethodResponse = await response.json()

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
            toast.error(TOAST_MESSAGES.CONNECTION_ERROR)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDiscard = () => {
        handleClose()
    }

    if (!method) return null

    // Tip mapping
    const typeLabels = {
        credit_card: 'Kredi Kartı',
        bank_transfer: 'Banka Havalesi'
    }
    const getProviderFields = () => {
        return Object.keys(formData.apiCredentials).map(key => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            type: key.toLowerCase().includes('password') ? 'password' : 'text',
            required: false
        }))
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
                    {/* Ödeme Yöntemi Adı */}
                    <TextField
                        fullWidth
                        label='Ödeme Yöntemi Adı'
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={`Örn: ${method.providerMeta.displayName} - Ana Hesap`}
                        disabled={isLoading}
                        required
                    />

                    {/* Açıklama */}
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

                    {/* Öncelik */}
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

                    {/* Kredi Kartı Modu */}
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

                    <Divider>
                        <Chip label='API / Hesap Bilgileri' size='small' />
                    </Divider>

                    {/* Dinamik Field'lar */}
                    {getProviderFields().map(field => (
                        <TextField
                            key={field.key}
                            fullWidth
                            type={field.type}
                            label={field.label}
                            value={formData.apiCredentials[field.key] || ''}
                            onChange={e => handleCredentialChange(field.key, e.target.value)}
                            disabled={isLoading}
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