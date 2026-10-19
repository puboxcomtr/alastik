'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'

import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'

export type MemberFilters = {
    search: string
    status: string
    hasOrders: string
    from: string
    to: string
}

const EMPTY: MemberFilters = { search: '', status: '', hasOrders: '', from: '', to: '' }

const MemberTableFilters = ({ onFilterChange }: { onFilterChange: (filters: MemberFilters) => void }) => {
    const [filters, setFilters] = useState<MemberFilters>(EMPTY)

    const update = (field: keyof MemberFilters) => (e: ChangeEvent<HTMLInputElement>) =>
        setFilters({ ...filters, [field]: e.target.value })

    const apply = () => onFilterChange({ ...filters, search: filters.search.trim() })

    const clear = () => {
        setFilters(EMPTY)
        onFilterChange(EMPTY)
    }

    return (
        <CardContent>
            <Grid container spacing={5} alignItems='center'>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                        fullWidth
                        size='small'
                        label='Ara'
                        placeholder='İsim, e-posta, telefon, cari kodu'
                        value={filters.search}
                        onChange={update('search')}
                        onKeyDown={e => e.key === 'Enter' && apply()}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField select fullWidth size='small' label='Sipariş' value={filters.hasOrders} onChange={update('hasOrders')}>
                        <MenuItem value=''>Tümü</MenuItem>
                        <MenuItem value='yes'>Sipariş vermiş</MenuItem>
                        <MenuItem value='no'>Sipariş vermemiş</MenuItem>
                    </TextField>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                    <TextField fullWidth size='small' type='date' label='Kayıt (başlangıç)' value={filters.from} onChange={update('from')} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                    <TextField fullWidth size='small' type='date' label='Kayıt (bitiş)' value={filters.to} onChange={update('to')} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }} className='flex gap-2'>
                    <Button variant='contained' onClick={apply}>Uygula</Button>
                    <Button variant='outlined' color='secondary' onClick={clear}>Temizle</Button>
                </Grid>
            </Grid>
        </CardContent>
    )
}

export default MemberTableFilters
