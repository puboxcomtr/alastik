'use client'
import { useState } from 'react'

import Grid from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import Divider from '@mui/material/Divider'

const ORDER_STATUSES = [
    { value: 'pending', label: 'Onay Bekliyor' },
    { value: 'confirmed', label: 'Onaylandı' },
    { value: 'processing', label: 'Hazırlanıyor' },
    { value: 'shipped', label: 'Kargoya Verildi' },
    { value: 'delivered', label: 'Teslim Edildi' },
    { value: 'cancelled', label: 'İptal Edildi' },
    { value: 'returned', label: 'İade Edildi' }
]

const PAYMENT_STATUSES = [
    { value: 'all', label: 'Tümü' },
    { value: 'paid', label: 'Ödendi' },
    { value: 'pending', label: 'Bekliyor' },
    { value: 'failed', label: 'Başarısız' },
    { value: 'refunded', label: 'İade Edildi' },
    { value: 'cancelled', label: 'İptal Edildi' }
]

const PAYMENT_METHODS = [
    { value: 'bank_transfer', label: 'Banka Havalesi' },
    { value: 'credit_card', label: 'Kredi Kartı' },
    { value: 'credit_card_3d', label: 'Kredi Kartı 3D Secure' },
    { value: 'netahsilat_installment', label: 'Kredi Kartı Taksitli' },
    { value: 'cash_on_delivery', label: 'Kapıda Ödeme' }
]

type Filters = {
    orderNumber: string
    status: string
    paymentStatus: string
    paymentMethod: string
    stockCode: string
    phone: string
    startDate: string
    endDate: string
}

const EMPTY_FILTERS: Filters = {
    orderNumber: '',
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    stockCode: '',
    phone: '',
    startDate: '',
    endDate: ''
}

const TableFilters = ({
    onFilterChange
}: {
    onFilterChange: (filters: Record<string, string>) => void
}) => {
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
    const [open, setOpen] = useState(false)
    const [searchInput, setSearchInput] = useState('')

    const handleChange = (field: keyof Filters) => (e: any) => {
        setFilters(prev => ({ ...prev, [field]: e.target.value }))
    }

    const buildParams = (currentFilters: Filters, currentSearch: string) => {
        const params: Record<string, string> = {}
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value && value.trim() !== '') {
                params[key] = value.trim()
            }
        })
        if (currentSearch.trim() !== '') {
            params.search = currentSearch.trim()
        }
        return params
    }

    const handleSearch = () => {
        onFilterChange(buildParams(filters, searchInput))
        setOpen(false)
    }

    const handleReset = () => {
        setFilters(EMPTY_FILTERS)
        setSearchInput('')
        onFilterChange({})
        setOpen(false)
    }

    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            onFilterChange(buildParams(filters, searchInput))
        }
    }

    const handlePopoverKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
        }
    }

    const activeFilterCount = Object.values(filters).filter(v => v && v.trim() !== '').length

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 4 }}>
                <Badge badgeContent={activeFilterCount} color='primary'>
                    <Button
                        variant='outlined'
                        color='secondary'
                        startIcon={<i className='ri-filter-3-line' />}
                        endIcon={<i className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
                        onClick={() => setOpen(prev => !prev)}
                        sx={{ minWidth: 140 }}
                    >
                        Filtreler
                    </Button>
                </Badge>

                <TextField
                    size='small'
                    placeholder='Sipariş no, ad soyad veya email ile ara...'
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleSearchKeyPress}
                    sx={{ flex: 1, minWidth: 280 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position='start'>
                                <i className='ri-search-line' />
                            </InputAdornment>
                        )
                    }}
                />
            </Box>

            <Collapse in={open} timeout='auto' unmountOnExit>
                <Divider />
                <Box sx={{ p: 6 }}>
                    <Grid container spacing={4} onKeyDown={handlePopoverKeyPress}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                size='small'
                                label='Sipariş No (ID)'
                                placeholder='ALT2601...'
                                value={filters.orderNumber}
                                onChange={handleChange('orderNumber')}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Sipariş Durumu'
                                value={filters.status}
                                onChange={handleChange('status')}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {ORDER_STATUSES.map(s => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Ödeme Durumu'
                                value={filters.paymentStatus}
                                onChange={handleChange('paymentStatus')}
                            >
                                {PAYMENT_STATUSES.map(s => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                fullWidth
                                size='small'
                                label='Ödeme Türü'
                                value={filters.paymentMethod}
                                onChange={handleChange('paymentMethod')}
                            >
                                <MenuItem value=''>Tümü</MenuItem>
                                {PAYMENT_METHODS.map(m => (
                                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                size='small'
                                label='Ürün Stok Kodu'
                                placeholder='Stok kodu ile ara...'
                                value={filters.stockCode}
                                onChange={handleChange('stockCode')}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                size='small'
                                label='Cep Telefonu'
                                placeholder='05XX...'
                                value={filters.phone}
                                onChange={handleChange('phone')}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                size='small'
                                type='date'
                                label='Başlangıç Tarihi'
                                InputLabelProps={{ shrink: true }}
                                value={filters.startDate}
                                onChange={handleChange('startDate')}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                size='small'
                                type='date'
                                label='Bitiş Tarihi'
                                InputLabelProps={{ shrink: true }}
                                value={filters.endDate}
                                onChange={handleChange('endDate')}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={handleReset}
                            >
                                Temizle
                            </Button>
                            <Button
                                variant='contained'
                                onClick={handleSearch}
                            >
                                Filtrele
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Collapse>
        </Box>
    )
}

export default TableFilters