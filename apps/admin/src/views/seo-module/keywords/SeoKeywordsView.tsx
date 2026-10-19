'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { KeywordSuggestion, KeywordSuggestions, KeywordsData, SeoPeriodSelection, TrackedKeyword } from '../types'
import { buildPeriodQuery } from '../types'

import { formatDecimal, formatNumber, formatPercent } from '@/views/analytics/reports/format'

import tableStyles from '@core/styles/table.module.css'

import SeoTabs from '../SeoTabs'
import SeoPeriodSelector from '../SeoPeriodSelector'
import EmptyState from '@/views/analytics/reports/EmptyState'

const SOURCE_LABELS: Record<TrackedKeyword['source'], string> = {
    manual: 'Elle',
    product: 'Ürün',
    search: 'Site araması',
    console: 'Search Console'
}

const SUGGESTION_GROUPS: { key: keyof KeywordSuggestions; title: string; note: string }[] = [
    { key: 'console', title: 'Google\'da zaten tıklama alanlar', note: 'Son 30 günün en çok tıklanan sorguları' },
    { key: 'product', title: 'Ürünlerde girilen anahtar kelimeler', note: 'En çok üründe tekrar edenler' },
    { key: 'search', title: 'Sitede aranan kelimeler', note: 'Vitrin arama kutusundan' }
]

const SeoKeywordsView = () => {
    const { lang: locale } = useParams()
    const [period, setPeriod] = useState<SeoPeriodSelection>({ key: '30d' })
    const [data, setData] = useState<KeywordsData | null>(null)
    const [suggestions, setSuggestions] = useState<KeywordSuggestions | null>(null)
    const [loading, setLoading] = useState(true)
    const [input, setInput] = useState('')
    const [adding, setAdding] = useState(false)

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)

        try {
            const [listRes, suggRes] = await Promise.all([
                fetchAPI(API_ENDPOINTS.seo.keywords(buildPeriodQuery(period)), { cache: 'no-store' }),
                fetchAPI(API_ENDPOINTS.seo.keywordSuggestions(), { cache: 'no-store' })
            ])

            if (listRes.success) setData(listRes.data as KeywordsData)
            else toast.error(listRes.message || 'Anahtar kelimeler yüklenemedi')

            if (suggRes.success) setSuggestions(suggRes.data as KeywordSuggestions)
        } catch (error) {
            console.error('SEO keywords fetch error:', error)
            toast.error(error instanceof Error ? error.message : 'Anahtar kelimeler yüklenirken hata oluştu')
        } finally {
            if (!silent) setLoading(false)
        }
    }, [period])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    const addKeywords = async (keywords: string[], source: string = 'manual') => {
        const cleaned = keywords.map(k => k.trim()).filter(Boolean)

        if (cleaned.length === 0) return

        setAdding(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.keywords(), { method: 'POST', body: JSON.stringify({ keywords: cleaned, source }) })

            if (res.success) {
                toast.success(res.message || 'Eklendi')
                setInput('')
                await fetchAll(true)
            } else {
                toast.error(res.message || 'Eklenemedi')
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Eklenemedi')
        } finally {
            setAdding(false)
        }
    }

    const removeKeyword = async (item: TrackedKeyword) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.keywordDelete(item._id), { method: 'DELETE' })

            if (res.success) {
                setData(prev => (prev ? { ...prev, items: prev.items.filter(k => k._id !== item._id) } : prev))
                toast.success(res.message || 'Kaldırıldı')
                fetchAll(true)
            } else {
                toast.error(res.message || 'Kaldırılamadı')
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Kaldırılamadı')
        }
    }

    const items = data?.items ?? []
    const subtitle = data?.period ? `${data.period.label} · ${items.length} kelime izleniyor` : ''

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <SeoTabs active='keywords' />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <SeoPeriodSelector title='Anahtar Kelimeler' subtitle={subtitle} value={period} onChange={setPeriod} />
            </Grid>

            {data && !data.hasData ? (
                <Grid size={{ xs: 12 }}>
                    <Alert severity='info' action={<Button component={Link} href={`/${locale}/apps/seo/report`} color='inherit' size='small'>Genel Rapor</Button>}>
                        Pozisyon ve tıklama verisi Search Console bağlantısı kurulup ilk çekim yapıldıktan sonra dolar. Listeyi şimdiden oluşturabilirsiniz.
                    </Alert>
                </Grid>
            ) : null}

            <Grid size={{ xs: 12, lg: 8 }}>
                <Card className='bs-full'>
                    <CardHeader
                        title='Takip listesi'
                        subheader='Virgül veya satır ile ayırarak birden fazla kelime ekleyebilirsiniz'
                    />
                    <CardContent className='flex flex-wrap items-start gap-3'>
                        <TextField
                            size='small'
                            multiline
                            maxRows={4}
                            placeholder='Örn. 205 55 r16 yaz lastiği, michelin primacy 4 fiyat'
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            className='flex-1 min-is-[260px]'
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    addKeywords(input.split(/[\n,]+/))
                                }
                            }}
                        />
                        <Button variant='contained' color='primary' startIcon={<i className='ri-add-line' />} disabled={adding || !input.trim()} onClick={() => addKeywords(input.split(/[\n,]+/))}>
                            Ekle
                        </Button>
                    </CardContent>

                    {loading ? (
                        <div className='flex items-center justify-center gap-3' style={{ minHeight: 200 }}>
                            <CircularProgress size={28} />
                            <Typography>Yükleniyor...</Typography>
                        </div>
                    ) : items.length === 0 ? (
                        <EmptyState message='Henüz takip edilen kelime yok' minHeight={160} />
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className={tableStyles.table}>
                                <thead>
                                    <tr>
                                        <th>Kelime</th>
                                        <th className='text-end'>Pozisyon</th>
                                        <th className='text-end'>Değişim</th>
                                        <th className='text-end'>Tıklama</th>
                                        <th className='text-end'>Gösterim</th>
                                        <th className='text-end'>CTR</th>
                                        <th>Kaynak</th>
                                        <th className='text-end'></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(k => (
                                        <tr key={k._id}>
                                            <td><Typography className='font-medium'>{k.keyword}</Typography></td>
                                            <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{k.position === null ? <Typography variant='body2' color='text.disabled'>Veri yok</Typography> : formatDecimal(k.position, 1)}</td>
                                            <td className='text-end'>
                                                {k.delta === null ? (
                                                    <Typography variant='body2' color='text.disabled'>—</Typography>
                                                ) : Math.abs(k.delta) < 0.5 ? (
                                                    <Chip size='small' variant='tonal' label='Sabit' />
                                                ) : (
                                                    <Chip size='small' variant='tonal' color={k.delta > 0 ? 'success' : 'error'} label={`${k.delta > 0 ? '▲' : '▼'} ${formatDecimal(Math.abs(k.delta), 1)}`} />
                                                )}
                                            </td>
                                            <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(k.clicks)}</td>
                                            <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(k.impressions)}</td>
                                            <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPercent(k.ctr)}</td>
                                            <td><Typography variant='body2' color='text.secondary'>{SOURCE_LABELS[k.source]}</Typography></td>
                                            <td className='text-end'>
                                                <Tooltip title='Takipten çıkar'>
                                                    <IconButton size='small' onClick={() => removeKeyword(k)} aria-label='Takipten çıkar'>
                                                        <i className='ri-delete-bin-6-line' />
                                                    </IconButton>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
                <Card className='bs-full'>
                    <CardHeader title='Öneriler' subheader='Tıklayarak takibe ekleyin' />
                    <CardContent className='flex flex-col gap-5'>
                        {!suggestions ? (
                            <EmptyState message='Öneri yok' minHeight={80} />
                        ) : (
                            SUGGESTION_GROUPS.map(group => {
                                const list: KeywordSuggestion[] = suggestions[group.key] ?? []

                                return (
                                    <div key={group.key} className='flex flex-col gap-2'>
                                        <div className='flex flex-col'>
                                            <Typography className='font-medium'>{group.title}</Typography>
                                            <Typography variant='body2' color='text.secondary'>{group.note}</Typography>
                                        </div>
                                        {list.length === 0 ? (
                                            <Typography variant='body2' color='text.disabled'>Öneri yok</Typography>
                                        ) : (
                                            <div className='flex flex-wrap gap-2'>
                                                {list.map(s => (
                                                    <Tooltip key={`${group.key}-${s.keyword}`} title={s.hint}>
                                                        <Chip size='small' variant='outlined' label={s.keyword} icon={<i className='ri-add-line' />} onClick={() => addKeywords([s.keyword], s.source)} disabled={adding} />
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default SeoKeywordsView
