'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Manuel tahsilat kanalları
const MANUAL_CHANNELS = [
    { value: 'paynet', label: 'Paynet' },
    { value: 'otopirpos', label: 'Otopirpos' },
    { value: 'nkolay', label: 'NKolay' }
]

interface DiaIntegrationInfo {
    status?: string
    diaOrderKey?: string
    diaCustomerKey?: string
    diaInvoiceKey?: string
    invoicedAt?: string
    syncedAt?: string
    syncErrors?: string[]
}

interface OrderStatusProps {
    orderId: string
    status: string
    manualCollection?: { channel: string | null } | null
    diaIntegration?: DiaIntegrationInfo | null
    onStatusChange?: (newStatus: string) => void
}

const OrderStatus = ({ orderId, status, manualCollection, diaIntegration, onStatusChange }: OrderStatusProps) => {
    const initialChannel = manualCollection?.channel || ''
    const [collectionMode, setCollectionMode] = useState<'auto' | 'manual'>(initialChannel ? 'manual' : 'auto')
    const [channel, setChannel] = useState(initialChannel)
    const [dia, setDia] = useState<DiaIntegrationInfo>(diaIntegration || {})
    const [diaLoading, setDiaLoading] = useState(false)
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [sendDialogOpen, setSendDialogOpen] = useState(false)

    const diaSynced = dia?.status === 'synced'
    const diaFailed = dia?.status === 'failed'
    const diaCancelled = dia?.status === 'cancelled'
    const hasDiaRecords = !!(dia?.diaOrderKey || dia?.diaInvoiceKey)
    const lastDiaError = dia?.syncErrors?.length ? dia.syncErrors[dia.syncErrors.length - 1] : ''

    const applyDiaResult = (result: any) => {
        if (!result) return

        if (result.success) {
            toast.success(result.message || 'Sipariş DIA\'ya aktarıldı')
            setDia({
                ...dia,
                status: 'synced',
                diaOrderKey: result.diaOrderKey || result.data?.diaOrderKey || dia.diaOrderKey,
                syncedAt: new Date().toISOString()
            })
        } else if (result.skipped || result.data?.skipped) {
            // Entegrasyon kapalı — sessiz geç
        } else {
            toast.error(`DIA aktarımı başarısız: ${result.message || 'bilinmeyen hata'}`)
            setDia({ ...dia, status: 'failed', syncErrors: [...(dia.syncErrors || []), result.message] })
        }
    }

    const applyStatusChange = async (newStatus: string) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.orders.updateStatus(orderId), {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            })
            toast.success('Sipariş durumu güncellendi')
            onStatusChange?.(newStatus)

            if (newStatus === 'cancelled' && res?.dia) {
                // DIA iptal sonucu
                if (res.dia.success) {
                    toast.success(res.dia.message || 'DIA kayıtları iptal edildi')
                    if (!res.dia.skipped) setDia({ ...dia, status: 'cancelled' })
                } else if (!res.dia.skipped) {
                    toast.error(`DIA iptali başarısız: ${res.dia.message || 'bilinmeyen hata'}`)
                    setDia({ ...dia, status: 'failed', syncErrors: [...(dia.syncErrors || []), res.dia.message] })
                }
            } else if (res?.dia) {
                // Onaylandı seçildiyse API DIA aktarımını da denedi — sonucu göster
                applyDiaResult(res.dia)
            }
        } catch (error) {
            toast.error('Sipariş durumu güncellenirken hata oluştu')
        }
    }

    const handleStatusChange = (newStatus: string) => {
        // İptalde DIA kaydı varsa önce onay iste
        if (newStatus === 'cancelled' && hasDiaRecords && !diaCancelled) {
            setCancelDialogOpen(true)
            return
        }
        applyStatusChange(newStatus)
    }

    const performDiaSync = async () => {
        try {
            setDiaLoading(true)
            const res = await fetchAPI(API_ENDPOINTS.orders.syncDia(orderId), { method: 'POST' })

            if (res?.data?.skipped) {
                toast.info('DIA sipariş entegrasyonu bu site için kapalı')
                return
            }

            applyDiaResult({ ...res, diaOrderKey: res?.data?.diaOrderKey })
        } catch (error) {
            toast.error('DIA gönderimi sırasında hata oluştu')
        } finally {
            setDiaLoading(false)
        }
    }

    const saveChannel = async (newChannel: string | null) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.orders.manualCollection(orderId), {
                method: 'PUT',
                body: JSON.stringify({ channel: newChannel })
            })

            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.message || 'Manuel tahsilat bilgisi kaydedilemedi')
            }
        } catch (error) {
            toast.error('Manuel tahsilat bilgisi kaydedilemedi')
        }
    }

    const handleModeChange = (mode: 'auto' | 'manual') => {
        setCollectionMode(mode)

        // Otomatiğe dönülürse kayıtlı manuel kanal temizlenir
        if (mode === 'auto' && channel) {
            setChannel('')
            saveChannel(null)
        }
    }

    const handleChannelChange = (newChannel: string) => {
        setChannel(newChannel)
        saveChannel(newChannel)
    }

    const diaChipLabel = diaSynced ? 'Aktarıldı' : diaCancelled ? 'İptal Edildi' : diaFailed ? 'Hata' : 'Bekliyor'
    const diaChipColor = diaSynced ? 'success' : diaCancelled ? 'warning' : diaFailed ? 'error' : 'default'

    return (
        <Card>
            <CardContent className='flex flex-col gap-6'>
                <Typography variant='h5'>Sipariş Durumu</Typography>
                <FormControl fullWidth size='small' variant='outlined'>
                    <Select
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        sx={{
                            minWidth: 150,
                            '& .MuiSelect-select': {
                                fontSize: '0.875rem',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center'
                            }
                        }}
                    >
                        <MenuItem value="pending">Onay Bekliyor</MenuItem>
                        <MenuItem value="confirmed">Onaylandı</MenuItem>
                        <MenuItem value="processing">Hazırlanıyor</MenuItem>
                        <MenuItem value="shipped">Kargoya Verildi</MenuItem>
                        <MenuItem value="delivered">Teslim Edildi</MenuItem>
                        <MenuItem value="cancelled">İptal Edildi</MenuItem>
                        <MenuItem value="returned">İade Edildi</MenuItem>
                        <MenuItem value="payment_failed">Başarısız</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth size='small' variant='outlined'>
                    <InputLabel id='collection-mode-label'>Tahsilat</InputLabel>
                    <Select
                        labelId='collection-mode-label'
                        label='Tahsilat'
                        value={collectionMode}
                        onChange={(e) => handleModeChange(e.target.value as 'auto' | 'manual')}
                    >
                        <MenuItem value='auto'>Otomatik (Site Üzerinden)</MenuItem>
                        <MenuItem value='manual'>Manuel</MenuItem>
                    </Select>
                </FormControl>

                {collectionMode === 'manual' && (
                    <FormControl fullWidth size='small' variant='outlined'>
                        <InputLabel id='manual-channel-label'>Tahsilat Kanalı</InputLabel>
                        <Select
                            labelId='manual-channel-label'
                            label='Tahsilat Kanalı'
                            value={channel}
                            onChange={(e) => handleChannelChange(e.target.value)}
                        >
                            {MANUAL_CHANNELS.map(c => (
                                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                <Divider />

                <div className='flex flex-col gap-3'>
                    <div className='flex items-center justify-between'>
                        <Typography variant='subtitle2'>DIA Entegrasyonu</Typography>
                        <Chip size='small' label={diaChipLabel} color={diaChipColor} variant='tonal' />
                    </div>

                    {diaSynced && dia.diaOrderKey && (
                        <Typography variant='caption' color='text.secondary'>
                            DIA sipariş anahtarı: {dia.diaOrderKey}
                        </Typography>
                    )}

                    {dia.diaInvoiceKey && !diaCancelled && (
                        <Typography variant='caption' color='text.secondary'>
                            Fatura kesildi (anahtar: {dia.diaInvoiceKey})
                        </Typography>
                    )}

                    {diaFailed && lastDiaError && (
                        <Typography variant='caption' color='error'>
                            {lastDiaError}
                        </Typography>
                    )}

                    {!diaCancelled && (
                        <Button
                            variant='outlined'
                            size='small'
                            onClick={() => setSendDialogOpen(true)}
                            disabled={diaLoading}
                            startIcon={diaLoading ? <CircularProgress size={16} /> : <i className='ri-upload-cloud-2-line' />}
                        >
                            {diaLoading ? 'Gönderiliyor...' : diaSynced ? 'DIA Eksiklerini Tamamla' : 'DIA\'ya Gönder'}
                        </Button>
                    )}
                </div>

                {/* Sipariş iptali onayı — DIA kayıtları da iptal edilir */}
                <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
                    <DialogTitle>Siparişi İptal Et</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            DIA&apos;daki ilgili kayıtlar iptal edilecektir: fatura iptal edilir,
                            stok iade edilir ve sipariş kaydı kaldırılır. Onaylıyor musunuz?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCancelDialogOpen(false)}>Vazgeç</Button>
                        <Button
                            color='error'
                            variant='contained'
                            onClick={() => {
                                setCancelDialogOpen(false)
                                applyStatusChange('cancelled')
                            }}
                        >
                            İptal Et
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Manuel DIA gönderimi onayı (banka havalesi vb.) */}
                <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)}>
                    <DialogTitle>{diaSynced ? 'DIA Eksiklerini Tamamla' : 'DIA\'ya Gönder'}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {diaSynced
                                ? 'Sipariş DIA\'ya aktarılmış durumda; mevcut kayıtlara dokunulmaz, yalnız eksik kalan adımlar (şirketler arası sipariş / fatura) tamamlanır. Onaylıyor musunuz?'
                                : 'İşlemi gerçekten onaylıyor musunuz? DIA\'da ilgili kayıtlar oluşturulacaktır (cari hesap, sipariş ve fatura).'}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSendDialogOpen(false)}>Vazgeç</Button>
                        <Button
                            color='primary'
                            variant='contained'
                            onClick={() => {
                                setSendDialogOpen(false)
                                performDiaSync()
                            }}
                        >
                            Onayla ve Gönder
                        </Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </Card>
    )
}

export default OrderStatus
