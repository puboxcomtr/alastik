'use client'

import { useState } from 'react'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import InputAdornment from '@mui/material/InputAdornment'

type Props = {
    filters: {
        search: string
        status: string
        brand: string
        season: string
    }
    onFilterChange: (key: string, value: string) => void
    brands: string[]
}

const XmlProductFilters = ({ filters, onFilterChange, brands }: Props) => {
    return (
        <div className='p-5'>
            <Grid container spacing={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        fullWidth
                        size='small'
                        label='Stok Kodu ile Arama'
                        value={filters.search}
                        onChange={e => onFilterChange('search', e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <i className='ri-search-line' />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size='small'>
                        <InputLabel>Durum</InputLabel>
                        <Select
                            label='Durum'
                            value={filters.status}
                            onChange={e => onFilterChange('status', e.target.value)}
                        >
                            <MenuItem value=''>Tümü</MenuItem>
                            <MenuItem value='pending'>Bekliyor</MenuItem>
                            <MenuItem value='synced_to_dia'>Eşleştirilen</MenuItem>
                            <MenuItem value='filtered_out'>Filtre Dışı</MenuItem>
                            <MenuItem value='error'>Hatalı</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size='small'>
                        <InputLabel>Marka</InputLabel>
                        <Select
                            label='Marka'
                            value={filters.brand}
                            onChange={e => onFilterChange('brand', e.target.value)}
                        >
                            <MenuItem value=''>Tümü</MenuItem>
                            {brands.map(b => (
                                <MenuItem key={b} value={b}>{b}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size='small'>
                        <InputLabel>Mevsim</InputLabel>
                        <Select
                            label='Mevsim'
                            value={filters.season}
                            onChange={e => onFilterChange('season', e.target.value)}
                        >
                            <MenuItem value=''>Tümü</MenuItem>
                            <MenuItem value='1'>Yaz</MenuItem>
                            <MenuItem value='2'>Kış</MenuItem>
                            <MenuItem value='3'>4 Mevsim</MenuItem>
                            <MenuItem value='0'>Belirtilmemiş</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </div>
    )
}

export default XmlProductFilters