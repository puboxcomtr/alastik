'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Type Imports
import type { SeoPeriodKey, SeoPeriodSelection } from './types'
import { SEO_PERIOD_LABELS } from './types'

// Util Imports
import { toDateInputValue } from '@/views/analytics/reports/format'

const PRESET_KEYS: Exclude<SeoPeriodKey, 'custom'>[] = ['yesterday', '7d', '30d', '6m', '1y']

type SeoPeriodSelectorProps = {
    title: string
    subtitle?: string
    value: SeoPeriodSelection
    onChange: (selection: SeoPeriodSelection) => void
    action?: React.ReactNode
}

// Search Console verisi 2-3 gün geriden geldiği için "Dün" yerine "Son Veri Günü" kullanılır
const SeoPeriodSelector = ({ title, subtitle, value, onChange, action }: SeoPeriodSelectorProps) => {
    const now = new Date()
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    const [customOpen, setCustomOpen] = useState(value.key === 'custom')
    const [from, setFrom] = useState(value.from ?? toDateInputValue(monthAgo))
    const [to, setTo] = useState(value.to ?? toDateInputValue(now))

    const customValid = Boolean(from && to && from <= to)

    return (
        <Card>
            <CardContent className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                    <div className='flex flex-col gap-1'>
                        <Typography variant='h4'>{title}</Typography>
                        {subtitle ? <Typography color='text.secondary'>{subtitle}</Typography> : null}
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                        {PRESET_KEYS.map(key => (
                            <Button
                                key={key}
                                size='small'
                                variant={value.key === key ? 'contained' : 'outlined'}
                                color='primary'
                                onClick={() => {
                                    setCustomOpen(false)
                                    onChange({ key })
                                }}
                            >
                                {SEO_PERIOD_LABELS[key]}
                            </Button>
                        ))}
                        <Button
                            size='small'
                            variant={value.key === 'custom' ? 'contained' : 'outlined'}
                            color='primary'
                            startIcon={<i className='ri-calendar-line' />}
                            onClick={() => setCustomOpen(open => !open)}
                        >
                            {SEO_PERIOD_LABELS.custom}
                        </Button>
                        {action}
                    </div>
                </div>
                {customOpen ? (
                    <div className='flex flex-wrap items-center gap-4'>
                        <TextField size='small' type='date' label='Başlangıç' value={from} onChange={e => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField size='small' type='date' label='Bitiş' value={to} onChange={e => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                        <Button variant='contained' color='primary' disabled={!customValid} onClick={() => customValid && onChange({ key: 'custom', from, to })}>
                            Uygula
                        </Button>
                        {!customValid ? (
                            <Typography variant='body2' color='error.main'>Başlangıç tarihi bitiş tarihinden sonra olamaz</Typography>
                        ) : null}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}

export default SeoPeriodSelector
