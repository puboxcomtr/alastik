'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { ContentListData, ContentRow, ContentType, ScanState, ScoreStatus } from '../types'
import { SOURCE_LABELS, STATUS_COLORS, STATUS_LABELS, TYPE_LABELS } from '../types'

import { formatNumber } from '@/views/analytics/reports/format'

import tableStyles from '@core/styles/table.module.css'

import SeoTabs from '../SeoTabs'
import ContentDetailDrawer from './ContentDetailDrawer'
import EmptyState from '@/views/analytics/reports/EmptyState'

const SCAN_POLL_MS = 3000
const SEARCH_DEBOUNCE_MS = 400
const TYPE_KEYS = Object.keys(TYPE_LABELS) as ContentType[]
const STATUS_FILTERS: { value: ScoreStatus | 'nokeyword' | ''; label: string }[] = [
    { value: '', label: 'Tüm durumlar' },
    { value: 'good', label: 'İyi' },
    { value: 'fair', label: 'Eksik' },
    { value: 'poor', label: 'Zayıf' },
    { value: 'none', label: 'Yapılmadı' },
    { value: 'nokeyword', label: 'Odak kelime girilmemiş' }
]

const scoreChipColor = (row: ContentRow) => STATUS_COLORS[row.status]

const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return ''

    const d = new Date(iso)

    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const SeoContentView = () => {
    const [type, setType] = useState<ContentType | ''>('')
    const [status, setStatus] = useState<ScoreStatus | 'nokeyword' | ''>('')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(0)
    const [limit, setLimit] = useState(25)
    const [data, setData] = useState<ContentListData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<ContentRow | null>(null)
    const [scanStarting, setScanStarting] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setQuery(search.trim())
            setPage(0)
        }, SEARCH_DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [search])

    const listQuery = useMemo(() => {
        const params = new URLSearchParams({ page: String(page + 1), limit: String(limit) })

        if (type) params.set('type', type)
        if (status) params.set('status', status)
        if (query.length >= 2) params.set('q', query)

        return params.toString()
    }, [page, limit, type, status, query])

    const fetchList = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.content(listQuery), { cache: 'no-store' })

            if (res.success) setData(res.data as ContentListData)
            else toast.error(res.message || 'İçerik listesi yüklenemedi')
        } catch (error) {
            console.error('SEO content fetch error:', error)
            toast.error(error instanceof Error ? error.message : 'İçerik listesi yüklenirken hata oluştu')
        } finally {
            if (!silent) setLoading(false)
        }
    }, [listQuery])

    useEffect(() => {
        fetchList()
    }, [fetchList])

    const scan: ScanState = data?.scan ?? null

    useEffect(() => {
        if (!scan?.running) return

        const timer = setInterval(() => fetchList(true), SCAN_POLL_MS)

        return () => clearInterval(timer)
    }, [scan?.running, fetchList])

    const handleScan = async () => {
        setScanStarting(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.contentScan(), { method: 'POST' })

            if (res.success) {
                toast.success(res.message || 'Tarama başlatıldı')
                await fetchList(true)
            } else {
                toast.error(res.message || 'Tarama başlatılamadı')
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Tarama başlatılamadı')
        } finally {
            setScanStarting(false)
        }
    }

    const handleUpdated = (row: ContentRow) => {
        setData(prev => prev ? { ...prev, items: prev.items.map(i => (i.type === row.type && i.refId === row.refId ? { ...i, ...row } : i)) } : prev)
        setSelected(prev => (prev ? { ...prev, ...row } : prev))
    }

    const summary = data?.summary
    const items = data?.items ?? []
    const total = data?.pagination.total ?? 0

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <SeoTabs active='content' />
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardContent className='flex flex-col gap-4'>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            <div className='flex flex-col gap-1'>
                                <Typography variant='h4'>İçerik Analizi</Typography>
                                <Typography color='text.secondary'>
                                    {summary?.lastScanAt ? `Son tarama ${formatDateTime(summary.lastScanAt)} · ${formatNumber(summary.total)} içerik` : 'Henüz tarama yapılmadı'}
                                </Typography>
                            </div>
                            <div className='flex flex-wrap items-center gap-2'>
                                <Button
                                    variant='contained'
                                    color='primary'
                                    startIcon={scan?.running ? <CircularProgress size={14} color='inherit' /> : <i className='ri-radar-line' />}
                                    onClick={handleScan}
                                    disabled={scanStarting || Boolean(scan?.running)}
                                >
                                    {scan?.running ? `Taranıyor: ${scan.currentType ? TYPE_LABELS[scan.currentType as ContentType] || scan.currentType : ''} (${formatNumber(scan.total)})` : 'Taramayı başlat'}
                                </Button>
                            </div>
                        </div>
                        {scan?.running ? <LinearProgress /> : null}
                        {scan && !scan.running && scan.error ? (
                            <Typography variant='body2' color='error.main'>Son tarama hatası: {scan.error}</Typography>
                        ) : null}

                        {summary ? (
                            <div className='flex flex-wrap gap-2'>
                                {(['good', 'fair', 'poor', 'none'] as ScoreStatus[]).map(s => (
                                    <Chip
                                        key={s}
                                        label={`${STATUS_LABELS[s]}: ${formatNumber(summary.byStatus[s] || 0)}`}
                                        color={status === s ? 'primary' : 'default'}
                                        variant={status === s ? 'filled' : 'outlined'}
                                        onClick={() => { setStatus(prev => (prev === s ? '' : s)); setPage(0) }}
                                    />
                                ))}
                                {TYPE_KEYS.filter(t => summary.byType[t]).map(t => (
                                    <Chip
                                        key={t}
                                        label={`${TYPE_LABELS[t]}: ${formatNumber(summary.byType[t]?.count || 0)} · ort. ${summary.byType[t]?.avgScore ?? 0}`}
                                        color={type === t ? 'primary' : 'default'}
                                        variant={type === t ? 'filled' : 'outlined'}
                                        onClick={() => { setType(prev => (prev === t ? '' : t)); setPage(0) }}
                                    />
                                ))}
                            </div>
                        ) : null}

                        <div className='flex flex-wrap items-center gap-3'>
                            <TextField
                                size='small'
                                placeholder='Başlık, odak kelime veya URL ara'
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className='min-is-[260px]'
                            />
                            <TextField select size='small' label='Tip' value={type} onChange={e => { setType(e.target.value as ContentType | ''); setPage(0) }} className='min-is-[160px]'>
                                <MenuItem value=''>Tüm tipler</MenuItem>
                                {TYPE_KEYS.map(t => <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>)}
                            </TextField>
                            <TextField select size='small' label='Durum' value={status} onChange={e => { setStatus(e.target.value as ScoreStatus | 'nokeyword' | ''); setPage(0) }} className='min-is-[200px]'>
                                {STATUS_FILTERS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                            </TextField>
                        </div>
                    </CardContent>

                    {loading ? (
                        <div className='flex items-center justify-center gap-3' style={{ minHeight: 240 }}>
                            <CircularProgress size={28} />
                            <Typography>İçerikler yükleniyor...</Typography>
                        </div>
                    ) : items.length === 0 ? (
                        <EmptyState message={summary?.total ? 'Bu filtreyle eşleşen içerik yok' : 'Puanları görmek için taramayı başlatın'} minHeight={200} />
                    ) : (
                        <>
                            <div className='overflow-x-auto'>
                                <table className={tableStyles.table}>
                                    <thead>
                                        <tr>
                                            <th>Tip</th>
                                            <th>Başlık</th>
                                            <th>Odak kelime</th>
                                            <th className='text-center'>Puan</th>
                                            <th>Durum</th>
                                            <th>SEO alanı</th>
                                            <th className='text-end'>Kaldı</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(row => (
                                            <tr key={`${row.type}-${row.refId}`} className='cursor-pointer' onClick={() => setSelected(row)}>
                                                <td><Typography variant='body2' color='text.secondary'>{TYPE_LABELS[row.type]}</Typography></td>
                                                <td className='max-is-[420px]'>
                                                    <Typography className='truncate font-medium' title={row.title}>{row.title || '—'}</Typography>
                                                    <Typography variant='body2' color='text.secondary' className='truncate' title={row.url}>{row.url}</Typography>
                                                </td>
                                                <td className='max-is-[220px]'>
                                                    {row.focusKeyword ? (
                                                        <Typography className='truncate' title={row.focusKeyword}>{row.focusKeyword}</Typography>
                                                    ) : (
                                                        <Typography variant='body2' color='text.disabled'>Girilmedi</Typography>
                                                    )}
                                                </td>
                                                <td className='text-center'>
                                                    <Chip size='small' color={scoreChipColor(row)} variant='tonal' label={row.status === 'none' && !row.focusKeyword ? `${row.score}` : row.score} sx={{ minWidth: 44, fontVariantNumeric: 'tabular-nums' }} />
                                                </td>
                                                <td><Typography variant='body2'>{STATUS_LABELS[row.status]}</Typography></td>
                                                <td><Typography variant='body2' color='text.secondary'>{SOURCE_LABELS[row.source]}</Typography></td>
                                                <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{row.failed}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <TablePagination
                                component='div'
                                count={total}
                                page={page}
                                rowsPerPage={limit}
                                rowsPerPageOptions={[25, 50, 100]}
                                onPageChange={(_, p) => setPage(p)}
                                onRowsPerPageChange={e => { setLimit(parseInt(e.target.value, 10)); setPage(0) }}
                                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${formatNumber(count)}`}
                            />
                        </>
                    )}
                </Card>
            </Grid>

            <ContentDetailDrawer open={Boolean(selected)} item={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
        </Grid>
    )
}

export default SeoContentView
