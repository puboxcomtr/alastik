'use client'

// B2B bayi başvuruları — login sayfasındaki başvuru formu kayıtları.
// Durum akışı: Yeni → İncelendi → Onaylandı/Reddedildi. Onay, hesap AÇMAZ:
// bayilik DIA'da açılır, Cariler sayfasındaki senkronla listeye düşer.
import { useEffect, useState } from 'react'

import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import tableStyles from '@core/styles/table.module.css'

interface ApplicationRow {
    id: string
    companyName: string
    contactName: string
    email: string
    phone: string
    city: string
    district: string
    address: string
    taxOffice: string
    taxNumber: string
    yearsOfExperience: string
    monthlySalesVolume: string
    brands: string[]
    wantsBrandedSignage: boolean
    message: string
    status: string
    statusLabel: string
    adminNote: string
    createdAt: string
}

const STATUS_OPTIONS = [
    { value: 'new', label: 'Yeni', color: 'info' },
    { value: 'reviewed', label: 'İncelendi', color: 'warning' },
    { value: 'approved', label: 'Onaylandı', color: 'success' },
    { value: 'rejected', label: 'Reddedildi', color: 'error' }
] as const

const statusColor = (status: string) =>
    (STATUS_OPTIONS.find(o => o.value === status)?.color || 'default') as any

const formatDate = (value: string) =>
    new Date(value).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const ApplicationsList = () => {
    const [rows, setRows] = useState<ApplicationRow[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [total, setTotal] = useState(0)
    const [status, setStatus] = useState('')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [openRow, setOpenRow] = useState<string | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
        return () => clearTimeout(timer)
    }, [searchInput])

    const load = async () => {
        try {
            setLoading(true)
            const res = await fetchAPI(API_ENDPOINTS.b2bApplications.list({ page, limit, status, search }), { cache: 'no-store' })
            if (res?.success) {
                setRows(res.data || [])
                setTotal(res.meta?.total || 0)
            }
        } catch {
            toast.error('Başvurular yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [page, limit, status, search])

    const changeStatus = async (row: ApplicationRow, next: string) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.b2bApplications.setStatus(row.id), {
                method: 'PUT',
                body: JSON.stringify({ status: next })
            })
            if (res?.success) {
                toast.success('Durum güncellendi')
                setRows(list => list.map(r => (r.id === row.id ? { ...r, status: next, statusLabel: STATUS_OPTIONS.find(o => o.value === next)?.label || next } : r)))
            } else {
                toast.error(res?.message || 'Durum güncellenemedi')
            }
        } catch {
            toast.error('Durum güncellenemedi')
        }
    }

    return (
        <Card>
            <div className='flex items-center gap-3 p-4'>
                <Typography variant='h6' style={{ whiteSpace: 'nowrap' }}>Bayi Başvuruları</Typography>
                <TextField
                    fullWidth
                    size='small'
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder='Firma, yetkili, e-posta veya şehir arayın'
                    InputProps={{ startAdornment: <InputAdornment position='start'><i className='ri-search-line' /></InputAdornment> }}
                />
                <TextField select size='small' value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} style={{ minWidth: 160 }}>
                    <MenuItem value=''>Tüm Durumlar</MenuItem>
                    {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
            </div>
            <Divider />
            <div style={{ position: 'relative' }}>
                {loading && (
                    <div className='flex items-center justify-center' style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, minHeight: 160 }}>
                        <CircularProgress size={24} />
                    </div>
                )}
                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Firma / Yetkili</th>
                                <th>İletişim</th>
                                <th>İl / İlçe</th>
                                <th>Aylık Satış</th>
                                <th>Tabela</th>
                                <th>Durum</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && !loading && (
                                <tr><td colSpan={8}><Typography className='text-center p-6' color='text.secondary'>Başvuru bulunmuyor</Typography></td></tr>
                            )}
                            {rows.map(row => (
                                <>
                                    <tr key={row.id}>
                                        <td><Typography variant='body2'>{formatDate(row.createdAt)}</Typography></td>
                                        <td>
                                            <Typography variant='body2' fontWeight='bold'>{row.companyName}</Typography>
                                            <Typography variant='body2' color='text.secondary'>{row.contactName}</Typography>
                                        </td>
                                        <td>
                                            <Typography variant='body2'>{row.email}</Typography>
                                            <Typography variant='body2' color='text.secondary'>{row.phone}</Typography>
                                        </td>
                                        <td><Typography variant='body2'>{row.city} / {row.district}</Typography></td>
                                        <td><Typography variant='body2'>{row.monthlySalesVolume}</Typography></td>
                                        <td>
                                            <Chip size='small' variant='tonal' color={row.wantsBrandedSignage ? 'success' : 'default'} label={row.wantsBrandedSignage ? 'Evet' : 'Hayır'} />
                                        </td>
                                        <td>
                                            <TextField
                                                select
                                                size='small'
                                                value={row.status}
                                                onChange={e => changeStatus(row, e.target.value)}
                                                variant='standard'
                                                InputProps={{ disableUnderline: true }}
                                            >
                                                {STATUS_OPTIONS.map(o => (
                                                    <MenuItem key={o.value} value={o.value}>
                                                        <Chip size='small' variant='tonal' color={o.color as any} label={o.label} />
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </td>
                                        <td>
                                            <IconButton size='small' onClick={() => setOpenRow(openRow === row.id ? null : row.id)}>
                                                <i className={openRow === row.id ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                                            </IconButton>
                                        </td>
                                    </tr>
                                    <tr key={`${row.id}-detail`}>
                                        <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                                            <Collapse in={openRow === row.id} timeout='auto' unmountOnExit>
                                                <div className='p-4' style={{ background: 'rgba(0,0,0,0.02)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 24px' }}>
                                                        <Typography variant='body2'><strong>Vergi Dairesi:</strong> {row.taxOffice}</Typography>
                                                        <Typography variant='body2'><strong>Vergi No:</strong> {row.taxNumber}</Typography>
                                                        <Typography variant='body2'><strong>Sektör Tecrübesi:</strong> {row.yearsOfExperience} yıl</Typography>
                                                        <Typography variant='body2'><strong>Çalıştığı Markalar:</strong> {row.brands.length ? row.brands.join(', ') : '-'}</Typography>
                                                    </div>
                                                    {row.address && <Typography variant='body2' className='mt-2'><strong>Adres:</strong> {row.address}</Typography>}
                                                    {row.message && <Typography variant='body2' className='mt-2'><strong>Mesaj:</strong> {row.message}</Typography>}
                                                </div>
                                            </Collapse>
                                        </td>
                                    </tr>
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <TablePagination
                component='div'
                count={total}
                page={page - 1}
                rowsPerPage={limit}
                onPageChange={(_, p) => setPage(p + 1)}
                onRowsPerPageChange={e => { setLimit(parseInt(e.target.value)); setPage(1) }}
                rowsPerPageOptions={[20, 50, 100]}
            />
        </Card>
    )
}

export default ApplicationsList
