'use client'

// React Imports
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

// Third-party Imports
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type DaySchedule = { open: string; close: string }
type WeekSchedule = Record<string, DaySchedule>

type ImportRow = {
    row: number
    name: string
    city: string
    district: string
    serviceCount: number
    status: 'ok' | 'skip' | 'error'
    errors: string[]
    warnings: string[]
}

type ImportSummary = { total: number; ok: number; skip: number; error: number; imported?: number }

type MontagePoint = {
    _id: string
    name: string
    city: string
    district: string
    address: string
    phone: string
    workingHours: string
    workingSchedule?: WeekSchedule
    services: { productKey: string; name: string; defaultPrice: number; price: number | null }[]
    image: string
    isActive: boolean
    order: number
}

// Telefonu +90 xxx xxx xx xx biçiminde gösterir
const formatPhoneDisplay = (value?: string) => {
    if (!value) return ''

    let digits = value.replace(/\D/g, '').replace(/^0+/, '')

    if (digits.startsWith('90')) digits = digits.slice(2)
    digits = digits.replace(/^0+/, '').slice(0, 10)

    if (!digits) return value

    return [`+90`, digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
        .filter(Boolean)
        .join(' ')
}

const columnHelper = createColumnHelper<MontagePoint>()

const MontageListTable = () => {
    const { lang: locale } = useParams()

    const [data, setData] = useState<MontagePoint[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Silme onayı
    const [deleteTarget, setDeleteTarget] = useState<MontagePoint | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Excel içe aktarma
    const importInputRef = useRef<HTMLInputElement>(null)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importRows, setImportRows] = useState<ImportRow[] | null>(null)
    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
    const [importLoading, setImportLoading] = useState(false)
    const [downloadingTemplate, setDownloadingTemplate] = useState(false)

    const fetchPoints = async () => {
        setLoading(true)

        try {
            const params = search ? `?search=${encodeURIComponent(search)}` : ''
            const res = await fetchAPI(`${API_ENDPOINTS.montage.list()}${params}`, { cache: 'no-store' })

            if (res.success) {
                setData(res.data || [])
            } else {
                toast.error(res.message || 'Montaj noktaları yüklenemedi')
            }
        } catch (error) {
            toast.error('Montaj noktaları yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPoints()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleToggle = async (point: MontagePoint) => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.montage.toggle(point._id), { method: 'PATCH' })

            if (res.success) {
                setData(prev => prev.map(p => (p._id === point._id ? { ...p, isActive: !p.isActive } : p)))
                toast.success(res.message)
            }
        } catch (error) {
            toast.error('Durum güncellenemedi')
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return

        setDeleting(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.montage.delete(deleteTarget._id), { method: 'DELETE' })

            if (res.success) {
                toast.success(`"${deleteTarget.name}" silindi`)
                setData(prev => prev.filter(p => p._id !== deleteTarget._id))
                setDeleteTarget(null)
            } else {
                toast.error(res.message || 'Silme başarısız')
            }
        } catch (error) {
            toast.error('Silme sırasında hata oluştu')
        } finally {
            setDeleting(false)
        }
    }

    // Şablonu API'den alıp indirir (base64 → xlsx dosyası)
    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.montage.importTemplate())

            if (!res.success) throw new Error(res.message)

            const binary = atob(res.data.base64)
            const bytes = new Uint8Array(binary.length)

            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

            const blob = new Blob([bytes], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')

            link.href = url
            link.download = res.data.filename || 'montaj-noktalari-sablon.xlsx'
            link.click()
            URL.revokeObjectURL(url)
        } catch (error: any) {
            toast.error(error?.message || 'Şablon indirilemedi')
        } finally {
            setDownloadingTemplate(false)
        }
    }

    // Dosya seçilince önizleme için API'ye gönderir
    const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]

        e.target.value = ''

        if (!file) return

        setImportLoading(true)

        try {
            const formData = new FormData()

            formData.append('file', file)

            const res = await fetchAPI(API_ENDPOINTS.montage.import(), { method: 'POST', body: formData })

            if (!res.success) throw new Error(res.message)

            setImportFile(file)
            setImportRows(res.data.rows || [])
            setImportSummary(res.data.summary || null)
        } catch (error: any) {
            toast.error(error?.message || 'Dosya okunamadı')
        } finally {
            setImportLoading(false)
        }
    }

    // Önizleme onaylanınca aynı dosyayı confirm ile gönderir
    const handleImportConfirm = async () => {
        if (!importFile) return

        setImportLoading(true)

        try {
            const formData = new FormData()

            formData.append('file', importFile)

            const res = await fetchAPI(API_ENDPOINTS.montage.import(true), { method: 'POST', body: formData })

            if (!res.success) throw new Error(res.message)

            toast.success(res.message || 'İçe aktarma tamamlandı')
            closeImportDialog()
            fetchPoints()
        } catch (error: any) {
            toast.error(error?.message || 'İçe aktarma başarısız')
        } finally {
            setImportLoading(false)
        }
    }

    const closeImportDialog = () => {
        setImportFile(null)
        setImportRows(null)
        setImportSummary(null)
    }

    const columns = useMemo<ColumnDef<MontagePoint, any>[]>(
        () => [
            columnHelper.accessor('name', {
                header: 'Montaj Noktası',
                cell: ({ row }) => (
                    <div className='flex items-center gap-3'>
                        {row.original.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={getImageUrl(row.original.image)}
                                alt={row.original.name}
                                style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover' }}
                            />
                        ) : (
                            <div
                                className='flex items-center justify-center'
                                style={{ width: 38, height: 38, borderRadius: 6, background: 'var(--mui-palette-action-hover)' }}
                            >
                                <i className='ri-map-pin-2-line' />
                            </div>
                        )}
                        <div className='flex flex-col'>
                            <Typography className='font-medium' color='text.primary'>
                                {row.original.name}
                            </Typography>
                            {row.original.phone && (
                                <Typography variant='body2'>{formatPhoneDisplay(row.original.phone)}</Typography>
                            )}
                        </div>
                    </div>
                )
            }),
            columnHelper.accessor('city', {
                header: 'İl / İlçe',
                cell: ({ row }) => (
                    <Typography color='text.primary'>
                        {[row.original.city, row.original.district].filter(Boolean).join(' / ')}
                    </Typography>
                )
            }),
            columnHelper.accessor('services', {
                header: 'Hizmetler',
                cell: ({ row }) => {
                    const services = row.original.services || []

                    if (services.length === 0) return <Typography variant='body2'>-</Typography>

                    return (
                        <div className='flex flex-wrap gap-1 max-is-[260px]'>
                            {services.slice(0, 3).map((s, i) => (
                                <Chip key={i} size='small' variant='tonal' label={s.name} />
                            ))}
                            {services.length > 3 && (
                                <Chip size='small' variant='tonal' color='secondary' label={`+${services.length - 3}`} />
                            )}
                        </div>
                    )
                }
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <Switch size='small' checked={row.original.isActive} onChange={() => handleToggle(row.original)} />
                        <Chip
                            size='small'
                            variant='tonal'
                            label={row.original.isActive ? 'Aktif' : 'Pasif'}
                            color={row.original.isActive ? 'success' : 'secondary'}
                        />
                    </div>
                )
            }),
            {
                id: 'actions',
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <Tooltip title='Düzenle'>
                            <Link href={`/${locale}/apps/montage/edit/${row.original._id}`}>
                                <IconButton size='small'>
                                    <i className='ri-edit-box-line' />
                                </IconButton>
                            </Link>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton size='small' onClick={() => setDeleteTarget(row.original)}>
                                <i className='ri-delete-bin-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                )
            }
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, locale]
    )

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel()
    })

    return (
        <>
            <Card>
                <CardHeader
                    title='Montaj Noktaları'
                    subheader='Lastik alan müşterilere montaj hizmeti verilecek noktalar'
                    action={
                        <div className='flex items-center gap-4'>
                            <TextField
                                size='small'
                                placeholder='Ara (ad, il, ilçe)'
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && fetchPoints()}
                            />
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={handleDownloadTemplate}
                                disabled={downloadingTemplate}
                                startIcon={<i className='ri-download-2-line' />}
                            >
                                {downloadingTemplate ? 'Hazırlanıyor...' : 'Şablon İndir'}
                            </Button>
                            <Button
                                variant='outlined'
                                color='primary'
                                onClick={() => importInputRef.current?.click()}
                                disabled={importLoading}
                                startIcon={<i className='ri-file-excel-2-line' />}
                            >
                                {importLoading && !importRows ? 'Okunuyor...' : "Excel'den İçe Aktar"}
                            </Button>
                            <Button
                                variant='contained'
                                color='primary'
                                component={Link}
                                href={`/${locale}/apps/montage/add`}
                                startIcon={<i className='ri-add-line' />}
                            >
                                Yeni Montaj Noktası
                            </Button>
                        </div>
                    }
                />
                <input
                    ref={importInputRef}
                    type='file'
                    accept='.xlsx,.xls'
                    hidden
                    onChange={handleImportFileSelect}
                />
                <Divider />
                <div style={{ position: 'relative' }}>
                    {loading && (
                        <div className='flex items-center justify-center gap-3' style={{ minHeight: '160px' }}>
                            <CircularProgress size={24} />
                            <Typography>Montaj noktaları yükleniyor...</Typography>
                        </div>
                    )}
                    {!loading && (
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
                                {data.length === 0 ? (
                                    <tbody>
                                        <tr>
                                            <td colSpan={columns.length} className='text-center'>
                                                Henüz montaj noktası eklenmemiş
                                            </td>
                                        </tr>
                                    </tbody>
                                ) : (
                                    <tbody>
                                        {table.getRowModel().rows.map(row => (
                                            <tr key={row.id}>
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            </Card>

            {/* Excel İçe Aktarma Önizlemesi */}
            <Dialog open={!!importRows} onClose={() => !importLoading && closeImportDialog()} maxWidth='md' fullWidth>
                <DialogTitle>Excel İçe Aktarma Önizlemesi</DialogTitle>
                <DialogContent>
                    {importSummary && (
                        <div className='flex flex-wrap items-center gap-2 mbe-4'>
                            <Chip size='small' variant='tonal' label={`Toplam: ${importSummary.total}`} />
                            <Chip size='small' variant='tonal' color='success' label={`Aktarılacak: ${importSummary.ok}`} />
                            {importSummary.skip > 0 && (
                                <Chip size='small' variant='tonal' color='warning' label={`Atlanacak: ${importSummary.skip}`} />
                            )}
                            {importSummary.error > 0 && (
                                <Chip size='small' variant='tonal' color='error' label={`Hatalı: ${importSummary.error}`} />
                            )}
                        </div>
                    )}
                    <div className='overflow-x-auto'>
                        <table className={tableStyles.table}>
                            <thead>
                                <tr>
                                    <th>Satır</th>
                                    <th>Bayi Adı</th>
                                    <th>İl / İlçe</th>
                                    <th>Hizmet</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(importRows || []).map(row => (
                                    <tr key={row.row}>
                                        <td>{row.row}</td>
                                        <td>
                                            <Typography color='text.primary'>{row.name || '-'}</Typography>
                                        </td>
                                        <td>{[row.city, row.district].filter(Boolean).join(' / ') || '-'}</td>
                                        <td>{row.serviceCount}</td>
                                        <td>
                                            <div className='flex flex-col gap-1'>
                                                <Chip
                                                    size='small'
                                                    variant='tonal'
                                                    label={row.status === 'ok' ? 'Hazır' : row.status === 'skip' ? 'Atlanacak' : 'Hata'}
                                                    color={row.status === 'ok' ? 'success' : row.status === 'skip' ? 'warning' : 'error'}
                                                    style={{ alignSelf: 'flex-start' }}
                                                />
                                                {row.errors.map((msg, i) => (
                                                    <Typography key={`e${i}`} variant='body2' color='error.main'>
                                                        {msg}
                                                    </Typography>
                                                ))}
                                                {row.warnings.map((msg, i) => (
                                                    <Typography key={`w${i}`} variant='body2' color='warning.main'>
                                                        {msg}
                                                    </Typography>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeImportDialog} color='secondary' disabled={importLoading}>
                        İptal
                    </Button>
                    <Button
                        onClick={handleImportConfirm}
                        variant='contained'
                        disabled={importLoading || !importSummary || importSummary.ok === 0}
                    >
                        {importLoading
                            ? 'Aktarılıyor...'
                            : `İçe Aktar (${importSummary?.ok ?? 0} kayıt)`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Silme Onayı */}
            <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
                <DialogTitle>Montaj Noktasını Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{deleteTarget?.name}"</strong> montaj noktasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} color='secondary' disabled={deleting}>
                        İptal
                    </Button>
                    <Button onClick={handleDelete} color='error' variant='contained' disabled={deleting}>
                        {deleting ? 'Siliniyor...' : 'Sil'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default MontageListTable
