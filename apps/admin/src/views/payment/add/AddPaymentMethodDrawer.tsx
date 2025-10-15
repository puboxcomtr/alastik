'use client'

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import Chip from '@mui/material/Chip'

// Toast
import { toast } from 'react-toastify'

type ProviderField = {
    key: string
    label: string
    type: string
    required: boolean
    placeholder?: string
    help?: string
}

type ProviderTemplate = {
    code: string
    name: string
    logo: string
    description: string
    requiredFields: ProviderField[]
    color?: string
    icon?: string
}

type Props = {
    open: boolean
    handleClose: () => void
    onSuccess: () => void
}

const AddPaymentMethodDrawer = ({ open, handleClose, onSuccess }: Props) => {
    const [isLoading, setIsLoading] = useState(false)
    const [providers, setProviders] = useState<any>(null)

    // Form State
    const [selectedType, setSelectedType] = useState<string>('')
    const [selectedProvider, setSelectedProvider] = useState<string>('')
    const [providerTemplate, setProviderTemplate] = useState<ProviderTemplate | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 0,
        apiCredentials: {} as Record<string, string>,
        mode: 'test'
    })

    // Provider'ları yükle
    useEffect(() => {
        if (open && !providers) {
            loadProviders()
        }
    }, [open])

    // Type değiştiğinde provider'ı resetle
    useEffect(() => {
        setSelectedProvider('')
        setProviderTemplate(null)
        setFormData(prev => ({
            ...prev,
            name: '',
            description: '',
            apiCredentials: {}
        }))
    }, [selectedType])

    // Provider seçildiğinde template'i yükle
    useEffect(() => {
        if (selectedType && selectedProvider && providers) {
            const template = providers[selectedType]?.[selectedProvider]
            if (template) {
                setProviderTemplate(template)
                setFormData(prev => ({
                    ...prev,
                    name: template.name,
                    description: template.description
                }))
            }
        }
    }, [selectedProvider, selectedType, providers])

    const loadProviders = async () => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
            const response = await fetch(`${baseUrl}/admin/settings/payment/providers`)
            const result = await response.json()

            if (result.success) {
                setProviders(result.data)
            }
        } catch (error) {
            console.error('Provider yükleme hatası:', error)
            toast.error('Provider listesi yüklenemedi')
        }
    }

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
        if (!selectedType) {
            toast.error('Lütfen ödeme tipini seçin')
            return false
        }

        if (!selectedProvider) {
            toast.error('Lütfen provider seçin')
            return false
        }

        if (!formData.name.trim()) {
            toast.error('Lütfen ödeme yöntemi adı girin')
            return false
        }

        // Required field kontrolü
        if (providerTemplate) {
            const missingFields = providerTemplate.requiredFields.filter(
                field => field.required && !formData.apiCredentials[field.key]
            )

            if (missingFields.length > 0) {
                toast.error(`Zorunlu alanları doldurun: ${missingFields.map(f => f.label).join(', ')}`)
                return false
            }
        }

        return true
    }

    const onSubmit = async () => {
        if (!validateForm() || isLoading) return
        setIsLoading(true)
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
            const payload: any = {
                type: selectedType,
                provider: selectedProvider,
                name: formData.name,
                description: formData.description,
                priority: formData.priority,
                apiCredentials: formData.apiCredentials
            }
            if (selectedType === 'credit_card') {
                payload.creditCardSettings = {
                    mode: formData.mode,
                    has3DSecure: true,
                    hasInstallment: true,
                    maxInstallment: 12
                }
            }

            if (selectedType === 'bank_transfer') {
                payload.bankTransferSettings = {
                    accountName: formData.apiCredentials.accountName,
                    accountNumber: formData.apiCredentials.accountNumber,
                    branchName: formData.apiCredentials.branchName,
                    branchCode: formData.apiCredentials.branchCode,
                    iban: formData.apiCredentials.iban,
                    swift: formData.apiCredentials.swift
                }
            }

            console.log('📤 Payload:', payload) 

            const response = await fetch(`${baseUrl}/admin/settings/payment`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            })

            const result = await response.json()
            console.log('📥 Response:', result) // Debug için

            if (result.success) {
                toast.success(`${formData.name} başarıyla eklendi!`, {
                    position: 'top-right',
                    autoClose: 3000
                })

                onSuccess()
                handleClose()
                resetForm()
            } else {
                toast.error(`Hata: ${result.message || 'Ödeme yöntemi eklenemedi'}`)
            }
        } catch (error) {
            console.error('❌ API hatası:', error)
            toast.error('Bağlantı hatası. Lütfen tekrar deneyin.')
        } finally {
            setIsLoading(false)
        }
    }

    const resetForm = () => {
        setSelectedType('')
        setSelectedProvider('')
        setProviderTemplate(null)
        setFormData({
            name: '',
            description: '',
            priority: 0,
            apiCredentials: {},
            mode: 'test'
        })
    }

    const handleDiscard = () => {
        resetForm()
        handleClose()
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
                <Typography variant='h5'>Yeni Ödeme Yöntemi Ekle</Typography>
                <IconButton size='small' onClick={handleDiscard}>
                    <i className='ri-close-line text-2xl' />
                </IconButton>
            </div>
            <Divider />

            <div className='p-5'>
                <form onSubmit={(e) => {
                    e.preventDefault()
                    onSubmit()
                }} className='flex flex-col gap-5'>

                    {/* Ödeme Tipi Seçimi */}
                    <FormControl fullWidth>
                        <InputLabel>Ödeme Tipi</InputLabel>
                        <Select
                            value={selectedType}
                            label='Ödeme Tipi'
                            onChange={(e) => setSelectedType(e.target.value)}
                            disabled={isLoading}
                        >
                            <MenuItem value='credit_card'>
                                <div className='flex items-center gap-2'>
                                    <i className='ri-bank-card-line text-xl' />
                                    <span>Kredi Kartı</span>
                                </div>
                            </MenuItem>
                            <MenuItem value='bank_transfer'>
                                <div className='flex items-center gap-2'>
                                    <i className='ri-bank-line text-xl' />
                                    <span>Banka Havalesi</span>
                                </div>
                            </MenuItem>
                        </Select>
                    </FormControl>

                    {/* Provider Seçimi */}
                    {selectedType && providers && (
                        <FormControl fullWidth>
                            <InputLabel>Provider Seçin</InputLabel>
                            <Select
                                value={selectedProvider}
                                label='Provider Seçin'
                                onChange={(e) => setSelectedProvider(e.target.value)}
                                disabled={isLoading}
                            >
                                {Object.entries(providers[selectedType] || {}).map(([key, provider]: [string, any]) => (
                                    <MenuItem key={key} value={key}>
                                        <div className='flex items-center gap-3'>
                                            {provider.icon && <span className='text-xl'>{provider.icon}</span>}
                                            <div className='flex flex-col'>
                                                <span className='font-medium'>{provider.name}</span>
                                                <span className='text-xs text-textSecondary'>{provider.description}</span>
                                            </div>
                                        </div>
                                    </MenuItem>
                                ))}
                            </Select>
                            {selectedType === 'bank_transfer' && (
                                <FormHelperText>Türkiye'deki 37 bankadan birini seçin</FormHelperText>
                            )}
                        </FormControl>
                    )}

                    {/* Provider seçildikten sonra dinamik form */}
                    {providerTemplate && (
                        <>
                            <Divider>
                                <Chip label='Temel Bilgiler' size='small' />
                            </Divider>

                            {/* Ödeme Yöntemi Adı */}
                            <TextField
                                fullWidth
                                label='Ödeme Yöntemi Adı'
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={`Örn: ${providerTemplate.name} - Ana Hesap`}
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
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder='Ödeme yöntemi açıklaması (opsiyonel)'
                                disabled={isLoading}
                            />

                            {/* Öncelik */}
                            <TextField
                                fullWidth
                                type='number'
                                label='Öncelik'
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                                placeholder='Sıralama önceliği (0-999)'
                                disabled={isLoading}
                                helperText='Düşük sayı = Önce görünür'
                            />

                            {/* Kredi Kartı Modu */}
                            {selectedType === 'credit_card' && (
                                <FormControl fullWidth>
                                    <InputLabel>Mod</InputLabel>
                                    <Select
                                        value={formData.mode}
                                        label='Mod'
                                        onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                                        disabled={isLoading}
                                    >
                                        <MenuItem value='test'>
                                            <Chip label='Test' color='warning' size='small' sx={{ mr: 2 }} />
                                            Test Modu
                                        </MenuItem>
                                        <MenuItem value='live'>
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
                            {providerTemplate.requiredFields.map((field) => (
                                <TextField
                                    key={field.key}
                                    fullWidth
                                    type={field.type}
                                    label={field.label}
                                    value={formData.apiCredentials[field.key] || ''}
                                    onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    disabled={isLoading}
                                    required={field.required}
                                    helperText={field.help}
                                    InputProps={{
                                        ...(field.type === 'password' && {
                                            endAdornment: (
                                                <IconButton edge='end' size='small'>
                                                    <i className='ri-eye-line' />
                                                </IconButton>
                                            )
                                        })
                                    }}
                                />
                            ))}
                        </>
                    )}
                    {providerTemplate && (
                        <div className='flex items-center gap-4 justify-end'>
                            <Button
                                variant='outlined'
                                color='error'
                                onClick={handleDiscard}
                                disabled={isLoading}
                            >
                                Vazgeç
                            </Button>
                            <Button
                                variant='contained'
                                type='submit'
                                disabled={isLoading}
                            >
                                {isLoading ? 'Ekleniyor...' : 'Ekle'}
                            </Button>
                        </div>
                    )}
                </form>
            </div>
        </Drawer>
    )
}
export default AddPaymentMethodDrawer