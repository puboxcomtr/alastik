'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'

import Link from 'next/link'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import CustomAvatar from '@core/components/mui/Avatar'
import MemberAnnotateDialog from '../MemberAnnotateDialog'
import MemberDeleteDialog from '../MemberDeleteDialog'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { MemberDetail, MemberRow } from '../types'
import {
    STATUS_META, ORDER_STATUS_META, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS,
    fullName, initials, formatTRY, formatDate, formatDateTime, timeAgo
} from '../types'

const SectionCard = ({ title, count, children }: { title: string; count?: string; children: ReactNode }) => (
    <Card>
        <CardContent>
            <div className='flex items-center justify-between mbe-3'>
                <Typography variant='h6'>{title}</Typography>
                {count ? <Typography variant='body2' color='text.secondary'>{count}</Typography> : null}
            </div>
            {children}
        </CardContent>
    </Card>
)

const StatCard = ({ label, value }: { label: string; value: string }) => (
    <Card>
        <CardContent>
            <Typography variant='overline' color='text.secondary'>{label}</Typography>
            <Typography variant='h5' className='mbs-1'>{value}</Typography>
        </CardContent>
    </Card>
)

const MemberViewPage = () => {
    const params = useParams<{ id: string; lang: string }>()
    const router = useRouter()
    const id = String(params?.id || '')
    const locale = String(params?.lang || 'tr')

    const [data, setData] = useState<MemberDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [annotateOpen, setAnnotateOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [cartOpen, setCartOpen] = useState(false)
    const [statusBusy, setStatusBusy] = useState(false)

    const load = useCallback(async () => {
        if (!id) return
        setLoading(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.members.detail(id), { cache: 'no-store' })

            if (res.success) setData(res.data as MemberDetail)
            else toast.error(res.message || 'Üye bulunamadı')
        } catch {
            toast.error('Üye detayı yüklenemedi')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        load()
    }, [load])

    if (loading) {
        return (
            <div className='flex items-center justify-center gap-3' style={{ minHeight: '300px' }}>
                <CircularProgress size={28} />
                <Typography>Üye bilgileri yükleniyor...</Typography>
            </div>
        )
    }

    if (!data) {
        return (
            <div className='flex flex-col items-start gap-3'>
                <Typography color='text.secondary'>Üye bulunamadı.</Typography>
                <Button variant='outlined' onClick={() => router.push(`/${locale}/apps/user/list`)}>Üyeler listesine dön</Button>
            </div>
        )
    }

    const member = data.member as MemberRow & MemberDetail['member']
    const cart = data.cart || null
    const vehicles = data.vehicles || []
    const suspended = member.status === 'suspended'
    const statusMeta = STATUS_META[member.status]

    const toggleStatus = async () => {
        if (statusBusy) return
        setStatusBusy(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.members.setStatus(member._id), {
                method: 'PUT',
                body: JSON.stringify({ status: suspended ? 'active' : 'suspended' })
            })

            if (res.success) {
                toast.success(res.message || 'Durum güncellendi')
                load()
            } else {
                toast.error(res.message || 'Durum güncellenemedi')
            }
        } catch {
            toast.error('Durum güncellenemedi')
        } finally {
            setStatusBusy(false)
        }
    }

    const downloadCartCsv = () => {
        if (!cart?.items?.length) return
        const rows = [
            ['Ürün', 'Marka', 'Adet', 'Birim Fiyat (TL)', 'Tutar (TL)'],
            ...cart.items.map(i => [i.productName, i.brandName, String(i.quantity), formatTRY(i.unitPrice), formatTRY(i.lineTotal)]),
            ['', '', String(cart.itemCount), 'Toplam', formatTRY(cart.total)]
        ]
        const csv = '\ufeff' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const a = document.createElement('a')

        a.href = url
        a.download = `uye-sepeti-${fullName(member).replace(/\s+/g, '-').toLowerCase()}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <>
            <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <Link href={`/${locale}/apps/user/list`} className='flex items-center gap-1' style={{ color: 'var(--mui-palette-primary-main)' }}>
                        <i className='ri-arrow-left-line' />
                        <Typography color='primary.main'>Üyeler</Typography>
                    </Link>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        <div className='flex items-center gap-4'>
                            <CustomAvatar skin='light' color='primary' size={52}>{initials(member)}</CustomAvatar>
                            <div className='flex flex-col'>
                                <div className='flex items-center gap-2'>
                                    <Typography variant='h5'>{fullName(member)}</Typography>
                                    {member.status !== 'active' ? (
                                        <Chip size='small' variant='tonal' color={statusMeta?.color || 'default'} label={statusMeta?.label || member.status} />
                                    ) : null}
                                </div>
                                <Typography variant='body2' color='text.secondary'>
                                    {[member.email, member.phone].filter(Boolean).join(' · ')}
                                </Typography>
                                {member.adminTags?.length ? (
                                    <div className='flex flex-wrap gap-1 mbs-1'>
                                        {member.adminTags.map(tag => <Chip key={tag} size='small' variant='tonal' color='primary' label={tag} />)}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <div className='flex items-center gap-1'>
                            <Tooltip title='Etiket / Not'>
                                <IconButton onClick={() => setAnnotateOpen(true)}><i className='ri-edit-box-line' /></IconButton>
                            </Tooltip>
                            {member.status !== 'deleted' ? (
                                <>
                                    <Tooltip title={suspended ? 'Aktifleştir' : 'Askıya Al'}>
                                        <IconButton onClick={toggleStatus} disabled={statusBusy}>
                                            <i className={suspended ? 'ri-user-follow-line' : 'ri-user-forbid-line'} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title='Üyeyi Sil'>
                                        <IconButton onClick={() => setDeleteOpen(true)}><i className='ri-delete-bin-line' /></IconButton>
                                    </Tooltip>
                                </>
                            ) : null}
                        </div>
                    </div>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label='Sipariş' value={data.stats.orders.toLocaleString('tr-TR')} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label='Toplam Harcama' value={data.stats.totalSpend ? `${formatTRY(data.stats.totalSpend)} TL` : '—'} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label='Üyelik' value={formatDate(member.createdAt)} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label='Son Giriş' value={formatDate(member.lastLoginAt)} />
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent>
                            <div className='flex flex-wrap items-center justify-between gap-3'>
                                <div className='flex items-center gap-2'>
                                    <i className='ri-shopping-cart-2-line text-xl' />
                                    <Typography variant='h6'>Sepeti</Typography>
                                    {cart ? (
                                        <Typography variant='body1' color='success.main' fontWeight={600}>
                                            {cart.itemCount} adet · {formatTRY(cart.total)} TL
                                        </Typography>
                                    ) : (
                                        <Typography variant='body2' color='text.secondary'>Sepeti boş.</Typography>
                                    )}
                                </div>
                                {cart ? (
                                    <div className='flex items-center gap-3'>
                                        <Button size='small' variant='contained' color='success' startIcon={<i className='ri-download-2-line' />} onClick={downloadCartCsv}>
                                            Excel İndir
                                        </Button>
                                        <Button size='small' variant='text' color='secondary' onClick={() => setCartOpen(open => !open)}>
                                            {cart.updatedAt ? `${timeAgo(cart.updatedAt)} güncellendi` : 'Detay'}
                                            <i className={cartOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                            {cart && cartOpen ? (
                                <div className='mbs-4'>
                                    <Divider className='mbe-3' />
                                    {cart.items.map((item, idx) => (
                                        <div key={idx} className='flex items-center justify-between gap-3 plb-1'>
                                            <Typography variant='body2' color='text.primary'>
                                                {item.productName}{item.brandName ? ` · ${item.brandName}` : ''}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary' style={{ whiteSpace: 'nowrap' }}>
                                                {item.quantity} x {formatTRY(item.unitPrice)} TL = <b>{formatTRY(item.lineTotal)} TL</b>
                                            </Typography>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <SectionCard title='Adres Defteri' count={`${data.addresses.length} adres`}>
                        {data.addresses.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>Kayıtlı adres yok.</Typography>
                        ) : (
                            <Grid container spacing={4}>
                                {data.addresses.map(addr => (
                                    <Grid key={addr._id} size={{ xs: 12, md: 6 }}>
                                        <div className='flex flex-col gap-1 p-4 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
                                            <div className='flex items-center gap-2'>
                                                <Typography variant='body2' fontWeight='bold' color='text.primary'>{addr.addressName || 'Adres'}</Typography>
                                                {addr.isDefault ? <Chip size='small' variant='tonal' color='primary' label='Varsayılan' /> : null}
                                            </div>
                                            <Typography variant='body2'>{[addr.fullName, addr.phone].filter(Boolean).join(' · ')}</Typography>
                                            <Typography variant='body2' color='text.secondary'>{addr.addressDescription}</Typography>
                                            <Typography variant='body2' color='text.secondary'>{[addr.districtName, addr.cityName].filter(Boolean).join(' / ')}</Typography>
                                        </div>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </SectionCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <SectionCard title='Garajım — Araçlar' count={`${vehicles.length} araç`}>
                        {vehicles.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>Garajına araç eklememiş.</Typography>
                        ) : (
                            <Grid container spacing={4}>
                                {vehicles.map(v => (
                                    <Grid key={v._id} size={{ xs: 12, sm: 6, md: 4 }}>
                                        <div className='flex items-center gap-3 p-4 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
                                            <CustomAvatar skin='light' color='info' size={40}><i className='ri-car-line' /></CustomAvatar>
                                            <div className='flex flex-col'>
                                                <div className='flex items-center gap-2'>
                                                    <Typography variant='body2' fontWeight='bold' color='text.primary'>
                                                        {[v.makeName, v.modelName].filter(Boolean).join(' ') || 'Araç'}
                                                    </Typography>
                                                    {v.isPrimary ? <Chip size='small' variant='tonal' color='info' label='Birincil' /> : null}
                                                </div>
                                                <Typography variant='body2' color='text.secondary'>
                                                    {[v.year, v.plateNumber].filter(Boolean).join(' · ') || '—'}
                                                </Typography>
                                            </div>
                                        </div>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </SectionCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <SectionCard title='Siparişler' count={data.orders.length ? `${data.stats.orders.toLocaleString('tr-TR')} sipariş` : undefined}>
                        {data.orders.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>Bu üyenin siparişi yok.</Typography>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                                            {['Sipariş No', 'Tarih', 'Durum', 'Ödeme', 'Tutar'].map(h => (
                                                <th key={h} style={{ textAlign: h === 'Tutar' ? 'right' : 'left', padding: '8px 12px' }}>
                                                    <Typography variant='caption' color='text.secondary' textTransform='uppercase'>{h}</Typography>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.orders.map(order => {
                                            const meta = ORDER_STATUS_META[order.status] || { label: order.status, color: 'default' as const }

                                            return (
                                                <tr key={order._id} style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <Link href={`/${locale}/apps/order/detail/${order._id}`} style={{ color: 'var(--mui-palette-primary-main)' }}>
                                                            <Typography variant='body2' color='primary.main' fontWeight={600}>{order.orderNumber}</Typography>
                                                        </Link>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <Typography variant='body2'>{formatDateTime(order.createdAt)}</Typography>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <Chip size='small' variant='tonal' color={meta.color} label={meta.label} />
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <Typography variant='body2'>
                                                            {[PAYMENT_METHOD_LABELS[order.payment?.method || ''] || order.payment?.method, PAYMENT_STATUS_LABELS[order.payment?.status || ''] || order.payment?.status]
                                                                .filter(Boolean).join(' · ') || '—'}
                                                        </Typography>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                        <Typography variant='body2' fontWeight='bold'>{formatTRY(order.pricing?.total || 0)} TL</Typography>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </Grid>
            </Grid>

            <MemberAnnotateDialog member={annotateOpen ? member : null} onClose={() => setAnnotateOpen(false)} onSaved={() => load()} />
            <MemberDeleteDialog
                member={deleteOpen ? member : null}
                onClose={() => setDeleteOpen(false)}
                onDeleted={() => router.push(`/${locale}/apps/user/list`)}
            />
        </>
    )
}

export default MemberViewPage
