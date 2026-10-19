'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { ContentAnalysis, ContentType, SeoCheck } from './types'
import { STATUS_COLORS, STATUS_LABELS } from './types'

const ANALYZE_DEBOUNCE_MS = 700

type SeoLivePanelProps = {
    type: ContentType
    focusKeyword: string
    onFocusKeywordChange: (value: string) => void
    title: string
    description: string
    slug: string
    content: string | (() => string)
    keywords?: string[]
    refId?: string
    galleryImages?: number
    helperText?: string
}

const CheckIcon = ({ passed }: { passed: boolean | null }) => {
    if (passed === null) return <i className='ri-subtract-line text-lg' style={{ color: 'var(--mui-palette-text-disabled)' }} />
    if (passed) return <i className='ri-checkbox-circle-fill text-lg' style={{ color: 'var(--mui-palette-success-main)' }} />

    return <i className='ri-close-circle-fill text-lg' style={{ color: 'var(--mui-palette-error-main)' }} />
}

const SeoLivePanel = ({ type, focusKeyword, onFocusKeywordChange, title, description, slug, content, keywords, refId, galleryImages, helperText }: SeoLivePanelProps) => {
    const { lang: locale } = useParams()
    const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const requestId = useRef(0)

    const readContent = useCallback(() => (typeof content === 'function' ? content() : content) || '', [content])

    const runAnalysis = useCallback(async () => {
        const id = ++requestId.current

        setLoading(true)
        setError('')

        try {
            const res = await fetchAPI(API_ENDPOINTS.seo.analyze(), {
                method: 'POST',
                body: JSON.stringify({ type, focusKeyword, title, description, slug, content: readContent(), keywords, refId, galleryImages })
            })

            if (id !== requestId.current) return

            if (res.success) setAnalysis(res.data as ContentAnalysis)
            else setError(res.message || 'Analiz yapılamadı')
        } catch (e) {
            if (id !== requestId.current) return
            setError(e instanceof Error ? e.message : 'Analiz yapılamadı')
        } finally {
            if (id === requestId.current) setLoading(false)
        }
    }, [type, focusKeyword, title, description, slug, readContent, keywords, refId, galleryImages])

    useEffect(() => {
        const timer = setTimeout(runAnalysis, ANALYZE_DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [runAnalysis])

    const checks: SeoCheck[] = analysis?.checks ?? []
    const groups = Array.from(new Set(checks.map(c => c.group)))
    const status = analysis?.status ?? 'none'

    return (
        <div className='flex flex-col gap-4'>
            <TextField
                fullWidth
                label='Odak Anahtar Kelime'
                placeholder='Örn. 205 55 r16 yaz lastiği'
                value={focusKeyword}
                onChange={e => onFocusKeywordChange(e.target.value)}
                inputProps={{ maxLength: 120 }}
                helperText={helperText || "Bu içeriğin Google'da hangi aramada çıkmasını istiyorsanız onu yazın; aşağıdaki kontroller buna göre yapılır."}
            />

            <div className='flex flex-wrap items-center gap-3'>
                <div className='flex items-baseline gap-1'>
                    <Typography variant='h4' sx={{ color: status === 'none' ? 'text.disabled' : `${STATUS_COLORS[status]}.main`, lineHeight: 1 }}>
                        {analysis ? analysis.score : '—'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>/ 100</Typography>
                </div>
                {analysis ? <Chip size='small' variant='tonal' color={STATUS_COLORS[status]} label={STATUS_LABELS[status]} /> : null}
                {analysis ? (
                    <Typography variant='body2' color='text.secondary'>
                        {analysis.passed} geçti · {analysis.failed} kaldı{analysis.skipped ? ` · ${analysis.skipped} uygulanmadı` : ''}
                    </Typography>
                ) : null}
                <Tooltip title='Editördeki güncel içerikle yeniden analiz et'>
                    <span>
                        <Button size='small' variant='text' startIcon={loading ? <CircularProgress size={14} /> : <i className='ri-refresh-line' />} onClick={runAnalysis} disabled={loading}>
                            Yenile
                        </Button>
                    </span>
                </Tooltip>
            </div>

            {error ? <Typography variant='body2' color='error.main'>{error}</Typography> : null}

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

            {groups.map(group => (
                <div key={group} className='flex flex-col gap-1.5'>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{group}</Typography>
                    {checks.filter(c => c.group === group).map(check => (
                        <div key={check.key} className='flex items-start gap-2'>
                            <CheckIcon passed={check.passed} />
                            <div className='flex flex-col min-is-0'>
                                <Typography variant='body2' className='font-medium'>{check.label}</Typography>
                                <Typography variant='caption' color='text.secondary'>{check.detail}</Typography>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

export default SeoLivePanel
