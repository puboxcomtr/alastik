'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Switch from '@mui/material/Switch'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TablePagination from '@mui/material/TablePagination'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'

import classnames from 'classnames'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import tableStyles from '@core/styles/table.module.css'
import { getSiteUrl } from '@/utils/activeSite'

type RedirectType = {
    _id: string
    source: string
    target: string
    statusCode: number
    isActive: boolean
    updatedAt: string
}

const columnHelper = createColumnHelper<RedirectType>()

export default function RedirectsPage() {
    const site = ''
    const siteHeaders: Record<string, string> = {}
    const siteLabel = ''
    const siteUrl = getSiteUrl()

    const [items, setItems] = useState<RedirectType[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [limit, setLimit] = useState(50)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<RedirectType | null>(null)
    const [source, setSource] = useState('')
    const [target, setTarget] = useState('')
    const [saving, setSaving] = useState(false)

    const [importOpen, setImportOpen] = useState(false)
    const [importText, setImportText] = useState('')
    const [importing, setImporting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.redirects.list({ search, page: page + 1, limit }), { headers: siteHeaders })
            setItems(res.data || [])
            setTotal(res.meta?.total || 0)
        } catch {
            toast.error('Yönlendirmeler yüklenemedi')
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, limit, site])

    useEffect(() => { load() }, [load])

    const openAdd = () => { setEditing(null); setSource(''); setTarget(''); setDialogOpen(true) }
    const openEdit = (row: RedirectType) => { setEditing(row); setSource(row.source); setTarget(row.target); setDialogOpen(true) }

    const handleSave = async () => {
        if (!source.trim() || !target.trim()) { toast.error('Kaynak ve hedef URL zorunludur'); return }
        setSaving(true)
        try {
            const url = editing ? API_ENDPOINTS.redirects.update(editing._id) : API_ENDPOINTS.redirects.create()
            const res = await fetchAPI(url, {
                method: editing ? 'PUT' : 'POST',
                headers: siteHeaders,
                body: JSON.stringify({ source: source.trim(), target: target.trim() })
            })
            if (res.success) {
                toast.success(res.message || 'Kaydedildi')
                setDialogOpen(false)
                load()
            } else {
                toast.error(res.message || 'Kaydedilemedi')
            }
        } catch (e: any) {
            toast.error(e?.message || 'Kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async (row: RedirectType) => {
        const res = await fetchAPI(API_ENDPOINTS.redirects.update(row._id), {
            method: 'PUT',
            headers: siteHeaders,
            body: JSON.stringify({ isActive: !row.isActive })
        })
        if (res.success) { load() } else { toast.error(res.message || 'Güncellenemedi') }
    }

    const handleDelete = async (row: RedirectType) => {
        if (!confirm(`"${row.source}" yönlendirmesi silinsin mi?`)) return
        const res = await fetchAPI(API_ENDPOINTS.redirects.delete(row._id), { method: 'DELETE', headers: siteHeaders })
        if (res.success) { toast.success('Silindi'); load() } else { toast.error(res.message || 'Silinemedi') }
    }

    const handleImport = async () => {
        const rows = importText.split('\n').map(l => l.trim()).filter(Boolean)
        const parsed = rows.map(l => {
            const parts = l.split(/[;\t]|,(?=https?:\/\/|\/)/)
            return { source: (parts[0] || '').trim(), target: (parts[1] || '').trim() }
        }).filter(r => r.source && r.target)

        if (!parsed.length) { toast.error('Geçerli satır bulunamadı (her satır: kaynak;hedef)'); return }
        setImporting(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.redirects.import(), {
                method: 'POST',
                headers: siteHeaders,
                body: JSON.stringify({ items: parsed })
            })
            if (res.success) { toast.success(res.message); setImportOpen(false); setImportText(''); load() }
            else toast.error(res.message || 'İçe aktarım başarısız')
        } finally {
            setImporting(false)
        }
    }

    const columns = useMemo<ColumnDef<RedirectType, any>[]>(
        () => [
            columnHelper.accessor('source', {
                header: 'Kaynak URL',
                cell: ({ row }) => (
                    <Typography variant='body2' className='font-medium break-all' color='text.primary'>
                        {row.original.source}
                    </Typography>
                )
            }),
            columnHelper.accessor('target', {
                header: 'Hedef URL',
                cell: ({ row }) => (
                    <Typography variant='body2' color='text.secondary' className='break-all'>
                        {row.original.target}
                    </Typography>
                )
            }),
            columnHelper.accessor('isActive', {
                header: 'Aktif',
                cell: ({ row }) => (
                    <Switch size='small' checked={row.original.isActive} onChange={() => handleToggle(row.original)} />
                )
            }),
            columnHelper.accessor('_id', {
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='Test Et'>
                            <IconButton size='small' component='a' href={`${siteUrl}${row.original.source}`} target='_blank' rel='noopener noreferrer'>
                                <i className='ri-external-link-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Düzenle'>
                            <IconButton size='small' onClick={() => openEdit(row.original)}>
                                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton size='small' onClick={() => handleDelete(row.original)}>
                                <i className='ri-delete-bin-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                )
            })
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [siteUrl, site]
    )

    const table = useReactTable({
        data: items,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true
    })

    return (
        <Card>
            <CardHeader
                title='Yönlendirmeler'
                subheader='Eski adresler yeni adreslere 301 (kalıcı) olarak yönlendirilir. Değişiklikler ~1 dk içinde sitede etkinleşir.'
                action={
                    <div className='flex gap-2'>
                        <Button variant='outlined' onClick={() => setImportOpen(true)}>Toplu İçe Aktar</Button>
                        <Button variant='contained' onClick={openAdd}>Yeni Yönlendirme</Button>
                    </div>
                }
            />
            <div className='flex items-center gap-4 px-6 pb-4'>
                <TextField
                    size='small'
                    placeholder='Kaynak veya hedef URL ara...'
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                    className='max-w-[420px] w-full'
                />
                <Typography variant='body2' color='text.secondary'>{total} kayıt</Typography>
            </div>

            {loading ? (
                <div className='flex justify-center py-12'><CircularProgress /></div>
            ) : (
                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length ? (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className='text-center py-10'>Kayıt bulunamadı</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <TablePagination
                component='div'
                count={total}
                page={page}
                rowsPerPage={limit}
                rowsPerPageOptions={[25, 50, 100, 200]}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={e => { setLimit(parseInt(e.target.value)); setPage(0) }}
            />

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle>{editing ? 'Yönlendirmeyi Düzenle' : 'Yeni Yönlendirme'}</DialogTitle>
                <DialogContent className='flex flex-col gap-4 pt-2'>
                    <TextField
                        label='Kaynak URL (eski adres)'
                        placeholder='/eski-sayfa-adresi veya tam URL'
                        value={source}
                        onChange={e => setSource(e.target.value)}
                        fullWidth
                        autoFocus
                    />
                    <TextField
                        label='Hedef URL (yönlenecek adres)'
                        placeholder='/yeni-sayfa-adresi veya tam URL'
                        value={target}
                        onChange={e => setTarget(e.target.value)}
                        fullWidth
                    />
                    <Typography variant='caption' color='text.secondary'>
                        Kaynak adres, alan adından bağımsız yol olarak kaydedilir. Yönlendirme 301 (kalıcı) yapılır.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
                    <Button variant='contained' onClick={handleSave} disabled={saving}>
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth='md' fullWidth>
                <DialogTitle>Toplu İçe Aktar</DialogTitle>
                <DialogContent className='flex flex-col gap-4 pt-2'>
                    <Typography variant='body2' color='text.secondary'>
                        Her satıra bir yönlendirme: <code>kaynak;hedef</code> (CSV'den kopyala-yapıştır yapabilirsiniz)
                    </Typography>
                    <TextField
                        multiline
                        minRows={10}
                        maxRows={20}
                        placeholder={'/eski-adres-1;/yeni-adres-1\n/eski-adres-2;https://lastikjantavm.com/yeni-adres-2'}
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setImportOpen(false)}>Vazgeç</Button>
                    <Button variant='contained' onClick={handleImport} disabled={importing}>
                        {importing ? 'Aktarılıyor...' : 'İçe Aktar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    )
}

