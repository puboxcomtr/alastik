'use client'

import { useEffect, useState } from 'react'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Collapse from '@mui/material/Collapse'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

export type TagFilters = {
    search: string
    isActive: string
    hasProducts: string
    type: string
    width: string
    profile: string
    rim: string
    season: string
}

export const defaultFilters: TagFilters = {
    search: '',
    isActive: 'all',
    hasProducts: 'all',
    type: 'all',
    width: '',
    profile: '',
    rim: '',
    season: 'all'
}

type Props = {
    filters: TagFilters
    onChange: (filters: TagFilters) => void
    totalCount: number
}

const LabelFilters = ({ filters, onChange, totalCount }: Props) => {
    const [filterOptions, setFilterOptions] = useState<{
        widths: string[]
        profiles: string[]
        rims: string[]
    }>({ widths: [], profiles: [], rims: [] })

    const [searchValue, setSearchValue] = useState(filters.search)

    useEffect(() => {
        loadFilterOptions()
    }, [])

    // Search debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchValue !== filters.search) {
                onChange({ ...filters, search: searchValue })
            }
        }, 500)
        return () => clearTimeout(timeout)
    }, [searchValue])

    // Filtre dışından search değişirse (reset gibi)
    useEffect(() => {
        setSearchValue(filters.search)
    }, [filters.search])

    const loadFilterOptions = async () => {
        try {
            const res = await fetchAPI(`${API_ENDPOINTS.labels.list()}/filter-options`)
            if (res.success) {
                setFilterOptions(res.data)
            }
        } catch (err) {
            console.error('Filtre seçenekleri yüklenemedi:', err)
        }
    }

    const handleChange = (key: keyof TagFilters, value: string) => {
        const updated = { ...filters, [key]: value }

        // Tip değişirse lastik filtrelerini sıfırla
        if (key === 'type' && value !== 'tire_size') {
            updated.width = ''
            updated.profile = ''
            updated.rim = ''
            updated.season = 'all'
        }

        onChange(updated)
    }

    const handleReset = () => {
        setSearchValue('')
        onChange({ ...defaultFilters })
    }

    const isTireSize = filters.type === 'tire_size'
    const hasActiveFilter = filters.search !== '' ||
        filters.isActive !== 'all' ||
        filters.hasProducts !== 'all' ||
        filters.type !== 'all' ||
        filters.width !== '' ||
        filters.profile !== '' ||
        filters.rim !== '' ||
        filters.season !== 'all'

    return (
        <div className='flex flex-col gap-4 p-5'>
            {/* Üst satır: Arama + Genel filtreler */}
            <div className='flex flex-wrap items-center gap-4'>
                <TextField
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    placeholder='Etiket adı veya URL ile ara...'
                    size='small'
                    sx={{ minWidth: 250 }}
                />
                <TextField
                    select
                    value={filters.isActive}
                    onChange={e => handleChange('isActive', e.target.value)}
                    size='small'
                    label='Durum'
                    sx={{ minWidth: 130 }}
                >
                    <MenuItem value='all'>Tümü</MenuItem>
                    <MenuItem value='true'>Aktif</MenuItem>
                    <MenuItem value='false'>Pasif</MenuItem>
                </TextField>
                <TextField
                    select
                    value={filters.hasProducts}
                    onChange={e => handleChange('hasProducts', e.target.value)}
                    size='small'
                    label='Ürün Durumu'
                    sx={{ minWidth: 140 }}
                >
                    <MenuItem value='all'>Tümü</MenuItem>
                    <MenuItem value='true'>Ürün Var</MenuItem>
                    <MenuItem value='false'>Ürün Yok</MenuItem>
                </TextField>
                <TextField
                    select
                    value={filters.type}
                    onChange={e => handleChange('type', e.target.value)}
                    size='small'
                    label='Etiket Tipi'
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value='all'>Tümü</MenuItem>
                    <MenuItem value='general'>Genel</MenuItem>
                    <MenuItem value='tire_size'>Lastik</MenuItem>
                    <MenuItem value='rim_pcd'>Jant</MenuItem>
                </TextField>

                {hasActiveFilter && (
                    <Button
                        variant='outlined'
                        color='secondary'
                        size='small'
                        onClick={handleReset}
                        startIcon={<i className='ri-filter-off-line' />}
                    >
                        Sıfırla
                    </Button>
                )}
            </div>
            {/* Lastik filtreleri */}
            <Collapse in={isTireSize}>
                <Divider className='mb-2' />
                <div className='flex flex-wrap items-center gap-4 pt-2'>
                    <TextField
                        select
                        value={filters.width}
                        onChange={e => handleChange('width', e.target.value)}
                        size='small'
                        label='Genişlik'
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value=''>Tümü</MenuItem>
                        {filterOptions.widths.map(w => (
                            <MenuItem key={w} value={w}>{w}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        value={filters.profile}
                        onChange={e => handleChange('profile', e.target.value)}
                        size='small'
                        label='Yanak'
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value=''>Tümü</MenuItem>
                        {filterOptions.profiles.map(p => (
                            <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        value={filters.rim}
                        onChange={e => handleChange('rim', e.target.value)}
                        size='small'
                        label='Jant Çapı'
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value=''>Tümü</MenuItem>
                        {filterOptions.rims.map(r => (
                            <MenuItem key={r} value={r}>R{r}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        value={filters.season}
                        onChange={e => handleChange('season', e.target.value)}
                        size='small'
                        label='Mevsim'
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value='all'>Tümü</MenuItem>
                        <MenuItem value='yaz'>Yaz</MenuItem>
                        <MenuItem value='kis'>Kış</MenuItem>
                        <MenuItem value='4-mevsim'>4 Mevsim</MenuItem>
                        <MenuItem value='none'>Mevsimsiz</MenuItem>
                    </TextField>
                </div>
            </Collapse>
        </div>
    )
}

export default LabelFilters