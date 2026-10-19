'use client'

import { Fragment, Suspense, useCallback, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import CustomAvatar from '@core/components/mui/Avatar'
import tableStyles from '@core/styles/table.module.css'

import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'

import { formatDateTime, formatTRY, timeAgo } from '@views/members/types'
import { getSiteUrl, siteHasCartFollowUp } from '@/utils/activeSite'

const productUrl = (item?: { productSlug?: string } | null) => (item?.productSlug ? `${getSiteUrl()}/urun/${item.productSlug}` : '')

const YEAR_PATTERN = /^\d{4}$/

const productFacts = (item: { stockCode?: string; productionYear?: string; stock?: number | null; isXml?: boolean }) =>
    [
        item.stockCode ? `Stok Kodu: ${item.stockCode}` : '',
        item.productionYear && YEAR_PATTERN.test(item.productionYear) ? `Üretim Yılı: ${item.productionYear}` : '',
        typeof item.stock === 'number' ? `Stok: ${item.stock}` : '',
        item.isXml ? 'XML' : ''
    ].filter(Boolean)

const productFactsShort = (item: { stockCode?: string; productionYear?: string; stock?: number | null; isXml?: boolean }) =>
    [
        item.stockCode || '',
        item.productionYear && YEAR_PATTERN.test(item.productionYear) ? item.productionYear : '',
        typeof item.stock === 'number' ? `Stok: ${item.stock}` : '',
        item.isXml ? 'XML' : ''
    ].filter(Boolean)

type CartItem = {
    productKey: string
    productSlug?: string
    stockCode: string
    productionYear: string
    stock: number | null
    isXml: boolean
    productName: string
    productImage: string
    brandName: string
    itemType: string
    montagePointLabel: string
    quantity: number
    unitPrice: number
    lineTotal: number
    addedAt: string | null
}

type CartRow = {
    _id: string
    followUpStatus: CartStatus
    followUpAt: string | null
    followUpBy: string
    isGuest: boolean
    member: { _id: string; memberNo: number | null; firstName: string; lastName: string; email: string; phone: string } | null
    visitorCode: string
    items: CartItem[]
    itemCount: number
    total: number
    createdAt: string | null
    lastActivity: string | null
    expiresAt: string | null
}

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_ROWS_PER_PAGE = 20
const HOUR_MS = 60 * 60 * 1000

type CartStatus = 'pending' | 'contacted'

const CART_STATUSES: { value: CartStatus; label: string }[] = [
    { value: 'pending', label: 'Beklemede' },
    { value: 'contacted', label: 'İletişime Geçildi' }
]

const ALL_STATUSES = 'all'

type StatusTab = typeof ALL_STATUSES | CartStatus

const CART_TYPES = [
    { value: 'member', label: 'Üye Sepetleri' },
    { value: 'guest', label: 'Ziyaretçi Sepetleri' },
    { value: 'all', label: 'Tümü' }
]
const DEFAULT_CART_TYPE = 'member'

const remainingText = (iso: string | null) => {
    if (!iso) return '—'
    const left = new Date(iso).getTime() - Date.now()

    if (left <= 0) return 'Süresi doldu'
    const hours = Math.floor(left / HOUR_MS)

    if (hours < 1) return '1 saatten az'
    const days = Math.floor(hours / 24)

    return days > 0 ? `${days} gün ${hours % 24} saat` : `${hours} saat`
}

const ActiveCartsList = () => {
    const { lang: locale } = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

    const [rows, setRows] = useState<CartRow[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [limit, setLimit] = useState(DEFAULT_ROWS_PER_PAGE)
    const [openRow, setOpenRow] = useState<string | null>(null)

    const [filtersOpen, setFiltersOpen] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [typeInput, setTypeInput] = useState(DEFAULT_CART_TYPE)
    const [active, setActive] = useState({ search: '', type: DEFAULT_CART_TYPE })
    const [statusTab, setStatusTab] = useState<StatusTab>(ALL_STATUSES)
    const [followUpSetting, setFollowUpSetting] = useState<boolean | null>(null)
    useEffect(() => { setFollowUpSetting(siteHasCartFollowUp()) }, [])
    const followUpEnabled = followUpSetting === true
    const [statusCounts, setStatusCounts] = useState<Record<StatusTab, number>>({ all: 0, pending: 0, contacted: 0 })
    const [reloadKey, setReloadKey] = useState(0)

    const setPage = useCallback((next: number) => {
        const query = new URLSearchParams(searchParams.toString())

        query.set('page', String(next))
        router.push(`${pathname}?${query.toString()}`, { scroll: false })
    }, [router, pathname, searchParams])

    const applyFilters = (next: { search: string; type: string }) => {
        setActive(next)
        if (page !== 1) setPage(1)
    }

    const handleFilter = () => {
        applyFilters({ search: searchInput.trim(), type: typeInput })
        setFiltersOpen(false)
    }

    const handleReset = () => {
        setSearchInput('')
        setTypeInput(DEFAULT_CART_TYPE)
        applyFilters({ search: '', type: DEFAULT_CART_TYPE })
        setFiltersOpen(false)
    }

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)

            try {
                const res = await fetchAPI(
                    API_ENDPOINTS.carts.list({ page, limit, search: active.search, type: active.type === 'all' ? '' : active.type, status: statusTab === ALL_STATUSES ? '' : statusTab }),
                    { cache: 'no-store' }
                )

                if (cancelled) return

                if (res.success) {
                    setRows(res.data || [])
                    setTotal(res.meta?.total || 0)
                    if (res.statusCounts) setStatusCounts(res.statusCounts)
                } else {
                    toast.error(res.message || 'Aktif sepetler yüklenirken hata oluştu')
                }
            } catch (error) {
                if (!cancelled) toast.error(error instanceof Error && error.message ? error.message : 'Aktif sepetler yüklenirken hata oluştu')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [page, limit, active, statusTab, reloadKey])

    const filtered = active.search !== '' || active.type !== DEFAULT_CART_TYPE || statusTab !== ALL_STATUSES

    const changeStatusTab = (next: StatusTab) => {
        setStatusTab(next)
        if (page !== 1) setPage(1)
    }

    const changeCartStatus = async (row: CartRow, status: CartStatus) => {
        if (status === row.followUpStatus) return

        try {
            const res = await fetchAPI(API_ENDPOINTS.carts.setStatus(row._id), { method: 'PATCH', body: JSON.stringify({ status }) })

            if (res?.success) {
                toast.success(res.message || 'Sepet durumu güncellendi')
                setReloadKey(key => key + 1)
            } else {
                toast.error(res?.message || 'Sepet durumu güncellenemedi')
            }
        } catch (error) {
            toast.error(error instanceof Error && error.message ? error.message : 'Sepet durumu güncellenemedi')
        }
    }

    return (
        <Card>
            <CardHeader title='Aktif Sepetler' className='pbe-4' />
            {followUpEnabled ? (
                <>
                    <Tabs value={statusTab} onChange={(_, value) => changeStatusTab(value as StatusTab)} sx={{ px: 4 }}>
                        <Tab value={ALL_STATUSES} label={`Tümü (${statusCounts.all})`} />
                        {CART_STATUSES.map(status => (
                            <Tab key={status.value} value={status.value} label={`${status.label} (${statusCounts[status.value]})`} />
                        ))}
                    </Tabs>
                    <Divider />
                </>
            ) : null}
            <Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 4 }}>
                    <Badge badgeContent={typeInput !== DEFAULT_CART_TYPE ? 1 : 0} color='primary'>
                        <Button
                            variant='outlined'
                            color='secondary'
                            startIcon={<i className='ri-filter-3-line' />}
                            endIcon={<i className={filtersOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
                            onClick={() => setFiltersOpen(prev => !prev)}
                            sx={{ minWidth: 140 }}
                        >
                            Filtreler
                        </Button>
                    </Badge>
                    <TextField
                        size='small'
                        placeholder='Ad soyad, email, telefon veya ürün adı ile ara...'
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                applyFilters({ search: searchInput.trim(), type: typeInput })
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
                </Box>
                <Collapse in={filtersOpen} timeout='auto' unmountOnExit>
                    <Divider />
                    <Box sx={{ p: 6 }}>
                        <Grid container spacing={4}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    select
                                    fullWidth
                                    size='small'
                                    label='Sepet Türü'
                                    value={typeInput}
                                    onChange={e => setTypeInput(e.target.value)}
                                >
                                    {CART_TYPES.map(t => (
                                        <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                                <Button variant='outlined' color='secondary' onClick={handleReset}>Temizle</Button>
                                <Button variant='contained' onClick={handleFilter}>Filtrele</Button>
                            </Grid>
                        </Grid>
                    </Box>
                </Collapse>
            </Box>
            <Divider />

            <div style={{ position: 'relative' }}>
                {loading ? (
                    <div
                        className='flex items-center justify-center gap-3'
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--mui-palette-background-paper)', opacity: 0.85, zIndex: 1000, minHeight: 200 }}
                    >
                        <CircularProgress size={24} />
                        <Typography>Sepetler yükleniyor...</Typography>
                    </div>
                ) : null}

                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th>Sepet</th>
                                <th>Müşteri</th>
                                <th>Ürünler</th>
                                <th>Toplam</th>
                                <th>Son Hareket</th>
                                {followUpEnabled ? <th>Durum</th> : null}
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={followUpEnabled ? 7 : 6} className='text-center py-4'>
                                        <Typography variant='body1' color='text.secondary'>
                                            {filtered ? 'Arama kriterlerinize uygun sepet bulunamadı' : 'Aktif sepet bulunamadı'}
                                        </Typography>
                                    </td>
                                </tr>
                            ) : null}
                            {rows.map(row => {
                                const open = openRow === row._id
                                const first = row.items[0]
                                const toggle = () => setOpenRow(open ? null : row._id)

                                return (
                                    <Fragment key={row._id}>
                                        <tr className='cursor-pointer' style={{ cursor: 'pointer' }} onClick={toggle}>
                                            <td>
                                                <div className='flex flex-col'>
                                                    <Typography variant='body2' fontWeight='bold'>{formatDateTime(row.createdAt)}</Typography>
                                                    <Typography variant='body2'>#{row.visitorCode}</Typography>
                                                </div>
                                            </td>
                                            <td>
                                                <div className='flex flex-col'>
                                                    <div className='flex items-center gap-2'>
                                                        {row.member ? (
                                                            <Link
                                                                href={`/${locale}/apps/user/view/${row.member.memberNo ?? row.member._id}`}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <Typography className='font-medium' color='text.primary' noWrap sx={{ maxWidth: 220 }}>
                                                                    {`${row.member.firstName} ${row.member.lastName}`.trim() || row.member.email}
                                                                </Typography>
                                                            </Link>
                                                        ) : (
                                                            <Chip label='Ziyaretçi' size='small' variant='outlined' sx={{ height: 20, fontSize: '0.7rem' }} />
                                                        )}
                                                    </div>
                                                    {row.member ? (
                                                        <>
                                                            <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 220 }} title={row.member.email}>
                                                                {row.member.email}
                                                            </Typography>
                                                            {row.member.phone && row.member.phone !== '-' ? (
                                                                <Typography variant='caption' color='text.secondary'>{row.member.phone}</Typography>
                                                            ) : null}
                                                        </>
                                                    ) : (
                                                        <Typography variant='caption' color='text.secondary'>Üye girişi yapılmamış</Typography>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className='flex flex-col'>
                                                    {productUrl(first) ? (
                                                        <Typography
                                                            component='a'
                                                            href={productUrl(first)}
                                                            target='_blank'
                                                            rel='noopener noreferrer'
                                                            onClick={(e: MouseEvent) => e.stopPropagation()}
                                                            className='font-medium hover:underline'
                                                            color='text.primary'
                                                            noWrap
                                                            title={first?.productName}
                                                            sx={{ maxWidth: 250, display: 'block' }}
                                                        >
                                                            {first?.productName}
                                                        </Typography>
                                                    ) : (
                                                        <Typography className='font-medium' color='text.primary' noWrap title={first?.productName} sx={{ maxWidth: 250 }}>
                                                            {first?.productName || '—'}
                                                        </Typography>
                                                    )}
                                                    {first && productFactsShort(first).length > 0 ? (
                                                        <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 250 }} title={productFacts(first).join(' · ')}>
                                                            {productFactsShort(first).join(' · ')}
                                                        </Typography>
                                                    ) : null}
                                                    <Typography variant='caption' color='text.secondary'>
                                                        {row.items.length > 1 ? `+${row.items.length - 1} ürün daha · ` : ''}{row.itemCount} adet
                                                    </Typography>
                                                </div>
                                            </td>
                                            <td>
                                                <div className='flex flex-col'>
                                                    <Typography className='font-medium' color='text.primary' noWrap>{formatTRY(row.total)} TL</Typography>
                                                    <Typography variant='caption' color='text.secondary'>{row.items.length} kalem</Typography>
                                                </div>
                                            </td>
                                            <td>
                                                <div className='flex flex-col'>
                                                    <Tooltip title={formatDateTime(row.lastActivity)}>
                                                        <Typography className='font-medium' color='text.primary' noWrap>{timeAgo(row.lastActivity)}</Typography>
                                                    </Tooltip>
                                                    <Typography variant='caption' color='text.secondary' noWrap>Kalan: {remainingText(row.expiresAt)}</Typography>
                                                </div>
                                            </td>
                                            {followUpEnabled ? (
                                            <td>
                                                <div className='flex flex-col items-start' onClick={e => e.stopPropagation()}>
                                                    <TextField
                                                        select
                                                        size='small'
                                                        value={row.followUpStatus}
                                                        onChange={e => changeCartStatus(row, e.target.value as CartStatus)}
                                                        sx={{ minWidth: 170 }}
                                                    >
                                                        {CART_STATUSES.map(status => (
                                                            <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                    {row.followUpStatus === 'contacted' && row.followUpAt ? (
                                                        <Typography variant='caption' color='text.secondary' noWrap>
                                                            {[row.followUpBy, formatDateTime(row.followUpAt)].filter(Boolean).join(' · ')}
                                                        </Typography>
                                                    ) : null}
                                                </div>
                                            </td>
                                            ) : null}
                                            <td>
                                                <div className='flex items-center' onClick={e => e.stopPropagation()}>
                                                    <Tooltip title={open ? 'Ürünleri Gizle' : 'Sepeti Görüntüle'}>
                                                        <IconButton size='small' onClick={toggle}>
                                                            <i className={`${open ? 'ri-arrow-up-s-line' : 'ri-eye-line'} text-[22px] text-textSecondary`} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                        {open ? (
                                            <tr>
                                                <td colSpan={followUpEnabled ? 7 : 6}>
                                                    <div className='flex flex-col gap-3 plb-2'>
                                                        {row.items.map(item => (
                                                            <div key={item.productKey + item.montagePointLabel} className='flex items-center gap-4'>
                                                                {item.productImage ? (
                                                                    <img
                                                                        src={getImageUrl(item.productImage)}
                                                                        alt=''
                                                                        width={44}
                                                                        height={44}
                                                                        style={{ objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
                                                                    />
                                                                ) : (
                                                                    <CustomAvatar skin='light' color='secondary' variant='rounded' size={44}>
                                                                        <i className='ri-image-line' />
                                                                    </CustomAvatar>
                                                                )}
                                                                <div className='flex flex-col flex-1' style={{ minWidth: 0 }}>
                                                                    {productUrl(item) ? (
                                                                        <Typography
                                                                            component='a'
                                                                            href={productUrl(item)}
                                                                            target='_blank'
                                                                            rel='noopener noreferrer'
                                                                            variant='body2'
                                                                            color='text.primary'
                                                                            className='hover:underline'
                                                                            noWrap
                                                                            title={item.productName}
                                                                        >
                                                                            {item.productName}
                                                                        </Typography>
                                                                    ) : (
                                                                        <Typography variant='body2' color='text.primary' noWrap title={item.productName}>
                                                                            {item.productName}
                                                                        </Typography>
                                                                    )}
                                                                    <Typography variant='caption' color='text.secondary'>
                                                                        {[item.brandName, ...productFacts(item), item.montagePointLabel, item.addedAt ? `Eklenme: ${formatDateTime(item.addedAt)}` : '']
                                                                            .filter(Boolean)
                                                                            .join(' · ')}
                                                                    </Typography>
                                                                </div>
                                                                <Typography variant='body2' noWrap>
                                                                    {item.quantity} × {formatTRY(item.unitPrice)} TL
                                                                </Typography>
                                                                <Typography variant='body2' fontWeight='bold' color='text.primary' noWrap style={{ minWidth: 110, textAlign: 'end' }}>
                                                                    {formatTRY(item.lineTotal)} TL
                                                                </Typography>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
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

const ActiveCartsView = () => (
    <Suspense>
        <ActiveCartsList />
    </Suspense>
)

export default ActiveCartsView
