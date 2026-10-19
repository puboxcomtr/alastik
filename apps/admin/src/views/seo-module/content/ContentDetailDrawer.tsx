'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { ContentDetail, ContentRow, SeoCheck } from '../types'
import { STATUS_COLORS, STATUS_LABELS, TYPE_LABELS } from '../types'

import { getSiteUrl } from '@/utils/activeSite'

type ContentDetailDrawerProps = {
    open: boolean
    item: ContentRow | null
    onClose: () => void
    onUpdated: (row: ContentRow) => void
}

const scoreColor = (score: number, status: string) => (status === 'none' ? 'text.disabled' : score >= 80 ? 'success.main' : score >= 50 ? 'warning.main' : 'error.main')

const CheckIcon = ({ passed }: { passed: boolean | null }) => {
    if (passed === null) return <i className='ri-subtract-line text-xl' style={{ color: 'var(--mui-palette-text-disabled)' }} />
    if (passed) return <i className='ri-checkbox-circle-fill text-xl' style={{ color: 'var(--mui-palette-success-main)' }} />

    return <i className='ri-close-circle-fill text-xl' style={{ color: 'var(--mui-palette-error-main)' }} />
}

const ContentDetailDrawer = ({ open, item, onClose, onUpdated }: ContentDetailDrawerProps) => {
    const { lang: locale } = useParams()
    const [detail, setDetail] = useState<ContentDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [keyword, setKeyword] = useState('')

    useEffect(() => {
        if (!open || !item) return

        let cancelled = false

        setDetail(null)
        setKeyword(item.focusKeyword || '')
        setLoading(true)

        fetchAPI(API_ENDPOINTS.seo.contentDetail(item.type, item.refId), { cache: 'no-store' })
            .then(res => {
                if (cancelled) return

                if (res.success) {
                    setDetail(res.data as ContentDetail)
                    setKeyword((res.data as ContentDetail).focusKeyword || '')
                } else {
                    toast.error(res.message || 'İçerik analizi yüklenemedi')
                }
            })
            .catch(error => {
                if (!cancelled) toast.error(error instanceof Error ? error.message : 'İçerik analizi yüklenemedi')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [open, item])

    const handleSave = async () => {
        if (!item) return

        setSaving(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.contentFocusKeyword(item.type, item.refId), {
                method: 'PUT',
                body: JSON.stringify({ focusKeyword: keyword.trim() })
            })

            if (res.success) {
                const updated = res.data as ContentDetail

                setDetail(updated)
                onUpdated(updated)
                toast.success(res.message || 'Kaydedildi')
            } else {
                toast.error(res.message || 'Kaydedilemedi')
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    const analysis = detail?.analysis
    const checks: SeoCheck[] = analysis?.checks ?? []
    const groups = Array.from(new Set(checks.map(c => c.group)))
    const siteUrl = getSiteUrl()

    return (
        <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
            <div className='flex items-center justify-between plb-4 pli-6'>
                <div className='flex flex-col gap-1 min-is-0'>
                    <Typography variant='h5' className='truncate' title={item?.title}>{item?.title || 'İçerik'}</Typography>
                    {item ? (
                        <div className='flex flex-wrap items-center gap-2'>
                            <Chip size='small' variant='tonal' label={TYPE_LABELS[item.type]} />
                            {item.contentStatus ? <Chip size='small' variant='tonal' color='secondary' label={item.contentStatus} /> : null}
                        </div>
                    ) : null}
                </div>
                <IconButton onClick={onClose} aria-label='Kapat'>
                    <i className='ri-close-line' />
                </IconButton>
            </div>
            <Divider />

            {loading || !detail ? (
                <div className='flex items-center justify-center gap-3' style={{ minHeight: 240 }}>
                    {loading ? <><CircularProgress size={24} /><Typography>Analiz ediliyor...</Typography></> : <Typography color='text.secondary'>Analiz yüklenemedi</Typography>}
                </div>
            ) : (
                <div className='flex flex-col gap-6 p-6 overflow-y-auto'>
                    <div className='flex items-center gap-5'>
                        <div className='flex flex-col items-center justify-center rounded-full border-2' style={{ width: 84, height: 84, borderColor: `var(--mui-palette-${STATUS_COLORS[detail.status] === 'default' ? 'action-disabled' : `${STATUS_COLORS[detail.status]}-main`})` }}>
                            <Typography variant='h4' sx={{ color: scoreColor(detail.score, detail.status), lineHeight: 1 }}>{detail.score}</Typography>
                            <Typography variant='caption' color='text.secondary'>/ 100</Typography>
                        </div>
                        <div className='flex flex-col gap-1'>
                            <Chip size='small' color={STATUS_COLORS[detail.status]} variant='tonal' label={STATUS_LABELS[detail.status]} className='self-start' />
                            <Typography variant='body2' color='text.secondary'>
                                {analysis?.passed} geçti · {analysis?.failed} kaldı{analysis?.skipped ? ` · ${analysis.skipped} uygulanmadı` : ''}
                            </Typography>
                            <div className='flex flex-wrap gap-2 mbs-1'>
                                {detail.editPath ? (
                                    <Button component={Link} href={`/${locale}${detail.editPath}`} size='small' variant='outlined' startIcon={<i className='ri-edit-line' />}>Düzenle</Button>
                                ) : null}
                                {detail.url ? (
                                    <Button component='a' href={`${siteUrl}${detail.url}`} target='_blank' rel='noreferrer' size='small' variant='outlined' color='secondary' startIcon={<i className='ri-external-link-line' />}>Sitede aç</Button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <TextField
                            fullWidth
                            size='small'
                            label='Odak anahtar kelime'
                            placeholder='Örn. 205 55 r16 yaz lastiği'
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                            helperText={"Bu içeriğin Google'da hangi aramada çıkmasını istiyorsanız onu yazın; kriterler buna göre kontrol edilir."}
                        />
                        <div className='flex gap-2'>
                            <Button variant='contained' size='small' onClick={handleSave} disabled={saving || keyword.trim() === (detail.focusKeyword || '')}>
                                {saving ? 'Kaydediliyor...' : 'Kaydet ve yeniden puanla'}
                            </Button>
                            {detail.focusKeyword ? (
                                <Button variant='text' size='small' color='error' onClick={() => { setKeyword(''); }} disabled={saving}>Temizle</Button>
                            ) : null}
                        </div>
                    </div>

                    {analysis?.keywordUsage && analysis.keywordUsage.length > 0 ? (
                        <Alert severity='warning' icon={<i className='ri-error-warning-line' />}>
                            Bu odak kelime zaten başka içerikte kullanılıyor; aynı kelimeyle iki sayfa birbiriyle yarışır.
                            <div className='flex flex-col gap-0.5 mbs-1'>
                                {analysis.keywordUsage.map(u => (
                                    <Link key={`${u.type}-${u.refId}`} href={`/${locale}${u.editPath}`} target='_blank' className='underline'>{u.title}</Link>
                                ))}
                            </div>
                        </Alert>
                    ) : null}

                    <div className='flex flex-col gap-2'>
                        <Typography variant='subtitle2' color='text.secondary'>Vitrinde basılan</Typography>
                        <div className='flex flex-col gap-1 rounded p-3' style={{ background: 'var(--mui-palette-action-hover)' }}>
                            <Typography className='font-medium' style={{ color: 'var(--mui-palette-primary-main)' }}>{detail.effective?.title || '—'}</Typography>
                            <Typography variant='body2' color='success.main' className='truncate'>{siteUrl}{detail.url}</Typography>
                            <Typography variant='body2' color='text.secondary'>{detail.effective?.description || 'Meta açıklama yok'}</Typography>
                        </div>
                    </div>

                    {groups.map(group => (
                        <div key={group} className='flex flex-col gap-2'>
                            <Typography variant='subtitle2' color='text.secondary'>{group}</Typography>
                            <div className='flex flex-col gap-2'>
                                {checks.filter(c => c.group === group).map(check => (
                                    <div key={check.key} className='flex items-start gap-3'>
                                        <CheckIcon passed={check.passed} />
                                        <div className='flex flex-col min-is-0'>
                                            <div className='flex items-center gap-2'>
                                                <Typography className='font-medium'>{check.label}</Typography>
                                                {check.weight > 0 ? (
                                                    <Tooltip title='Puan ağırlığı'><Typography variant='caption' color='text.disabled'>{check.weight}p</Typography></Tooltip>
                                                ) : null}
                                            </div>
                                            <Typography variant='body2' color='text.secondary'>{check.detail}</Typography>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Drawer>
    )
}

export default ContentDetailDrawer
