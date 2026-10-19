'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import tableStyles from '@core/styles/table.module.css'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import { formatDateTime, formatTRY } from '@views/members/types'

type PaymentStatus = 'pending' | 'paid' | 'failed'

type PaymentRow = {
    _id: string
    createdAt: string
    paidAt: string | null
    status: PaymentStatus
    type: string
    gateway: string
    installment: number | null
    amount: number
    reference: string
    referenceCode: string
    transactionId: string
    authCode: string
    cardLastFour: string
    cardBank: string
    errorMessage: string
    errorCode: string
    cariKodu: string
    member: { _id: string; memberNo: number | null; name: string; email: string; phone: string } | null
}

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_ROWS_PER_PAGE = 20
const ALL_STATUSES = 'all'

type StatusTab = typeof ALL_STATUSES | PaymentStatus

const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: 'success' | 'warning' | 'error' }[] = [
    { value: 'paid', label: 'Ödendi', color: 'success' },
    { value: 'pending', label: 'Bekliyor', color: 'warning' },
    { value: 'failed', label: 'Başarısız', color: 'error' }
]

const INSTALLMENT_TYPE = 'taksit'

const PAYMENT_TYPES = [
    { value: '', label: 'Tüm Ödeme Türleri' },
    { value: 'tekcekim', label: 'Tek Çekim' },
    { value: INSTALLMENT_TYPE, label: 'Taksitli' }
]

const GATEWAY_LABELS: Record<string, string> = { paynet: 'Paynet', netahsilat: 'Netahsilat' }

const paymentTypeLabel = (row: PaymentRow) =>
    row.type === INSTALLMENT_TYPE ? (row.installment ? `${row.installment} Taksit` : 'Taksitli') : 'Tek Çekim'

const COLUMN_COUNT = 6

const PaymentLogsList = () => {
    const { lang: locale } = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

    const [rows, setRows] = useState<PaymentRow[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [limit, setLimit] = useState(DEFAULT_ROWS_PER_PAGE)

    const [searchInput, setSearchInput] = useState('')
    const [active, setActive] = useState({ search: '', type: '' })
    const [statusTab, setStatusTab] = useState<StatusTab>(ALL_STATUSES)
    const [statusCounts, setStatusCounts] = useState<Record<StatusTab, number>>({ all: 0, pending: 0, paid: 0, failed: 0 })
    const [paidAmount, setPaidAmount] = useState(0)

    const setPage = useCallback((next: number) => {
        const query = new URLSearchParams(searchParams.toString())

        query.set('page', String(next))
        router.push(`${pathname}?${query.toString()}`, { scroll: false })
    }, [router, pathname, searchParams])

    const applyFilters = (next: { search: string; type: string }) => {
        setActive(next)
        if (page !== 1) setPage(1)
    }

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)

            try {
                const res = await fetchAPI(
                    API_ENDPOINTS.b2bPayments.list({ page, limit, search: active.search, type: active.type, status: statusTab === ALL_STATUSES ? '' : statusTab }),
                    { cache: 'no-store' }
                )

                if (cancelled) return

                if (res.success) {
                    setRows(res.data || [])
                    setTotal(res.meta?.total || 0)
                    if (res.statusCounts) setStatusCounts(res.statusCounts)
                    setPaidAmount(Number(res.statusAmounts?.paid) || 0)
                } else {
                    toast.error(res.message || 'Ödeme kayıtları yüklenirken hata oluştu')
                }
            } catch (error) {
                if (!cancelled) toast.error(error instanceof Error && error.message ? error.message : 'Ödeme kayıtları yüklenirken hata oluştu')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [page, limit, active, statusTab])

    const filtered = active.search !== '' || active.type !== '' || statusTab !== ALL_STATUSES

    const changeStatusTab = (next: StatusTab) => {
        setStatusTab(next)
        if (page !== 1) setPage(1)
    }

    return (
        <Card>
            <CardHeader
                title='Ödemeler'
                subheader={`Bayi sitesindeki "Ödeme Yap" sayfasından başlatılan kart ödemeleri. Ödenen toplam: ${formatTRY(paidAmount)} TL`}
                className='pbe-4'
            />
            <Tabs value={statusTab} onChange={(_, value) => changeStatusTab(value as StatusTab)} sx={{ px: 4 }}>
                <Tab value={ALL_STATUSES} label={`Tümü (${statusCounts.all})`} />
                {PAYMENT_STATUSES.map(status => (
                    <Tab key={status.value} value={status.value} label={`${status.label} (${statusCounts[status.value]})`} />
                ))}
            </Tabs>
            <Divider />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 4 }}>
                <TextField
                    size='small'
                    placeholder='Cari adı, cari kodu, email, telefon veya referans ile ara...'
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            applyFilters({ search: searchInput.trim(), type: active.type })
                        }
                    }}
                    sx={{ flex: 1, minWidth: 280 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <i className='ri-search-line' />
                                </InputAdornment>
                            )
                        }
                    }}
                />
                <TextField
                    select
                    size='small'
                    value={active.type}
                    onChange={e => applyFilters({ search: searchInput.trim(), type: e.target.value })}
                    sx={{ minWidth: 200 }}
                    slotProps={{ select: { displayEmpty: true } }}
                >
                    {PAYMENT_TYPES.map(t => (
                        <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                </TextField>
            </Box>
            <Divider />

            <div style={{ position: 'relative' }}>
                {loading ? (
                    <div
                        className='flex items-center justify-center gap-3'
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--mui-palette-background-paper)', opacity: 0.85, zIndex: 1000, minHeight: 200 }}
                    >
                        <CircularProgress size={24} />
                        <Typography>Ödeme kayıtları yükleniyor...</Typography>
                    </div>
                ) : null}

                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Cari</th>
                                <th>Tutar</th>
                                <th>Ödeme Türü</th>
                                <th>Durum</th>
                                <th>Referans</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={COLUMN_COUNT} className='text-center py-4'>
                                        <Typography variant='body1' color='text.secondary'>
                                            {filtered ? 'Arama kriterlerinize uygun ödeme kaydı bulunamadı' : 'Ödeme kaydı bulunamadı'}
                                        </Typography>
                                    </td>
                                </tr>
                            ) : null}
                            {rows.map(row => {
                                const status = PAYMENT_STATUSES.find(s => s.value === row.status)
                                const card = [row.cardBank, row.cardLastFour ? `**** ${row.cardLastFour}` : ''].filter(Boolean).join(' ')

                                return (
                                    <tr key={row._id}>
                                        <td>
                                            <div className='flex flex-col'>
                                                <Typography variant='body2' fontWeight='bold'>{formatDateTime(row.createdAt)}</Typography>
                                                {row.paidAt ? (
                                                    <Typography variant='caption' color='text.secondary'>Ödeme: {formatDateTime(row.paidAt)}</Typography>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td>
                                            <div className='flex flex-col'>
                                                {row.member ? (
                                                    <Link href={`/${locale}/apps/user/view/${row.member.memberNo ?? row.member._id}`}>
                                                        <Typography className='font-medium' color='text.primary' noWrap sx={{ maxWidth: 300 }} title={row.member.name}>
                                                            {row.member.name || row.member.email}
                                                        </Typography>
                                                    </Link>
                                                ) : (
                                                    <Typography color='text.secondary'>—</Typography>
                                                )}
                                                <Typography variant='caption' color='text.secondary'>
                                                    {[row.cariKodu, row.member?.phone && row.member.phone !== '-' ? row.member.phone : ''].filter(Boolean).join(' · ')}
                                                </Typography>
                                            </div>
                                        </td>
                                        <td>
                                            <Typography variant='body2' fontWeight='bold' color='text.primary' noWrap>{formatTRY(row.amount)} TL</Typography>
                                        </td>
                                        <td>
                                            <div className='flex flex-col'>
                                                <Typography variant='body2'>{paymentTypeLabel(row)}</Typography>
                                                <Typography variant='caption' color='text.secondary'>{GATEWAY_LABELS[row.gateway] || row.gateway}</Typography>
                                            </div>
                                        </td>
                                        <td>
                                            <div className='flex flex-col items-start gap-1'>
                                                <Chip label={status?.label || row.status} color={status?.color || 'default'} size='small' variant='tonal' />
                                                {row.errorMessage ? (
                                                    <Typography variant='caption' color='error' sx={{ maxWidth: 260, whiteSpace: 'normal' }}>
                                                        {row.errorMessage}{row.errorCode ? ` (${row.errorCode})` : ''}
                                                    </Typography>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td>
                                            <div className='flex flex-col'>
                                                <Typography variant='body2'>{row.reference}</Typography>
                                                <Typography variant='caption' color='text.secondary'>
                                                    {[row.referenceCode, row.authCode ? `Onay: ${row.authCode}` : '', card].filter(Boolean).join(' · ')}
                                                </Typography>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <TablePagination
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                component='div'
                className='border-bs'
                count={total}
                rowsPerPage={limit}
                page={page - 1}
                onPageChange={(_, next) => setPage(next + 1)}
                onRowsPerPageChange={e => {
                    setLimit(Number(e.target.value))
                    if (page !== 1) setPage(1)
                }}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
        </Card>
    )
}

const PaymentLogsView = () => (
    <Suspense>
        <PaymentLogsList />
    </Suspense>
)

export default PaymentLogsView
