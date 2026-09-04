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
import type { PeriodKey, PeriodSelection } from './types'

// Util Imports
import { toDateInputValue } from './format'

export const PERIOD_LABELS: Record<PeriodKey, string> = {
    today: 'Bugün',
    week: 'Bu Hafta',
    month: 'Bu Ay',
    last_month: 'Geçen Ay',
    year: 'Bu Yıl',
    custom: 'Diğer tarihler'
}

const PRESET_KEYS: Exclude<PeriodKey, 'custom'>[] = ['today', 'week', 'month', 'last_month', 'year']

type PeriodSelectorProps = {
    value: PeriodSelection
    periodLabel: string
    onChange: (selection: PeriodSelection) => void
}

const PeriodSelector = ({ value, periodLabel, onChange }: PeriodSelectorProps) => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [customOpen, setCustomOpen] = useState(value.key === 'custom')
    const [from, setFrom] = useState(value.from ?? toDateInputValue(monthStart))
    const [to, setTo] = useState(value.to ?? toDateInputValue(now))

    const customValid = Boolean(from && to && from <= to)

    const handlePreset = (key: Exclude<PeriodKey, 'custom'>) => {
        setCustomOpen(false)
        onChange({ key })
    }

    const handleApplyCustom = () => {
        if (!customValid) return
        onChange({ key: 'custom', from, to })
    }

    return (
        <Card>
            <CardContent className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                    <div className='flex flex-col gap-1'>
                        <Typography variant='h4'>Raporlar</Typography>
                        <Typography color='text.secondary'>Seçili dönem: {periodLabel}</Typography>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        {PRESET_KEYS.map(key => (
                            <Button
                                key={key}
                                size='small'
                                variant={value.key === key ? 'contained' : 'outlined'}
                                color='primary'
                                onClick={() => handlePreset(key)}
                            >
                                {PERIOD_LABELS[key]}
                            </Button>
                        ))}
                        <Button
                            size='small'
                            variant={value.key === 'custom' ? 'contained' : 'outlined'}
                            color='primary'
                            startIcon={<i className='ri-calendar-line' />}
                            onClick={() => setCustomOpen(open => !open)}
                        >
                            {PERIOD_LABELS.custom}
                        </Button>
                    </div>
                </div>
                {customOpen ? (
                    <div className='flex flex-wrap items-center gap-4'>
                        <TextField
                            size='small'
                            type='date'
                            label='Başlangıç'
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            size='small'
                            type='date'
                            label='Bitiş'
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <Button variant='contained' color='primary' disabled={!customValid} onClick={handleApplyCustom}>
                            Uygula
                        </Button>
                        {!customValid ? (
                            <Typography variant='body2' color='error.main'>
                                Başlangıç tarihi bitiş tarihinden sonra olamaz
                            </Typography>
                        ) : null}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}

export default PeriodSelector
