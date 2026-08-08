'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Pagination from '@mui/material/Pagination'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@/libs/api'

type MediaFile = {
    id: string
    filename: string
    url: string
    size: number
    uploadDate: string
    folder: string
    alt?: string
    title?: string
    caption?: string
    description?: string
}

const FOLDERS: Record<string, string> = {
    general: 'Genel',
    urun: 'Ürün Görselleri',
    kategori: 'Kategori Görselleri',
    marka: 'Marka Görselleri',
    blog: 'Blog Görselleri'
}

const PER_PAGE = 30

/** Bayt değerini okunabilir biçime çevirir */
const formatSize = (bytes: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const formatDate = (value: string) => {
    if (!value) return '-'
    try {
        return new Date(value).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
        return value
    }
}

const MediaGallery = () => {
    const [files, setFiles] = useState<MediaFile[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [folder, setFolder] = useState('general')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Detay paneli ve çoklu seçim
    const [detail, setDetail] = useState<MediaFile | null>(null)
    const [selected, setSelected] = useState<string[]>([])
    const [deleteTarget, setDeleteTarget] = useState<MediaFile[] | null>(null)
    // Düzenlenebilir bilgiler ve tam ekran önizleme
    const [meta, setMeta] = useState({ alt: '', title: '', caption: '' })
    const [savingMeta, setSavingMeta] = useState(false)
    const [zoom, setZoom] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)

    const loadFiles = useCallback(async () => {
        setLoading(true)

        try {
            const url = API_ENDPOINTS.media.list({
                folder,
                search,
                page,
                limit: PER_PAGE,
                sortBy,
                sortOrder: sortBy === 'name' ? 'asc' : 'desc'
            })

            const data = await fetchAPI(`${url}&_t=${Date.now()}`)

            if (data.success) {
                setFiles(data.files || [])
                setTotalPages(data.totalPages || 1)
                setTotal(data.total ?? (data.files || []).length)
            } else {
                throw new Error(data.message || 'Dosyalar yüklenemedi')
            }
        } catch (error: any) {
            toast.error(error.message || 'Dosyalar yüklenemedi')
            setFiles([])
        } finally {
            setLoading(false)
        }
    }, [folder, search, page, sortBy])

    useEffect(() => {
        loadFiles()
    }, [loadFiles])

    // Arama kutusu: yazmayı bırakınca aranır
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1)
            setSearch(searchInput.trim())
        }, 400)

        return () => clearTimeout(timer)
    }, [searchInput])

    const uploadFiles = async (incoming: FileList | File[]) => {
        const list = Array.from(incoming).filter(f => f.type.startsWith('image/'))

        if (list.length === 0) {
            toast.error('Yalnızca görsel dosyaları yükleyebilirsiniz')
            return
        }

        setUploading(true)

        try {
            const formData = new FormData()
            list.forEach(file => formData.append('files', file))

            const data = await fetchAPI(API_ENDPOINTS.media.upload(folder), {
                method: 'POST',
                body: formData
            })

            if (!data.success) throw new Error(data.message || 'Yükleme başarısız')

            toast.success(`${list.length} dosya yüklendi`)
            setPage(1)
            setSearchInput('')
            // Dosya işlenip diske yazılana kadar kısa bir bekleme
            setTimeout(loadFiles, 800)
        } catch (error: any) {
            toast.error(error.message || 'Dosya yüklenemedi')
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return

        const targets = deleteTarget
        setDeleteTarget(null)

        let ok = 0
        for (const file of targets) {
            try {
                const data = await fetchAPI(API_ENDPOINTS.media.delete(file.id), { method: 'DELETE' })
                if (data.success) ok++
            } catch {
                // tek dosya hatası tüm işlemi durdurmasın
            }
        }

        if (ok > 0) {
            toast.success(`${ok} dosya silindi`)
            setSelected(prev => prev.filter(id => !targets.some(t => t.id === id)))
            if (detail && targets.some(t => t.id === detail.id)) setDetail(null)
            loadFiles()
        } else {
            toast.error('Dosya silinemedi')
        }
    }

    // Detay paneli açıldığında kayıtlı bilgileri forma yükle
    useEffect(() => {
        if (detail) setMeta({ alt: detail.alt || '', title: detail.title || '', caption: detail.caption || '' })
    }, [detail])

    const saveMeta = async () => {
        if (!detail) return

        try {
            setSavingMeta(true)
            const data = await fetchAPI(API_ENDPOINTS.media.updateMeta(), {
                method: 'PATCH',
                body: JSON.stringify({ folder: detail.folder, filename: detail.id, ...meta })
            })

            if (!data.success) throw new Error(data.message || 'Kaydedilemedi')

            toast.success('Dosya bilgileri kaydedildi')
            // Listeyi yeniden yüklemeden yerinde güncelle
            setFiles(prev => prev.map(f => (f.id === detail.id ? { ...f, ...meta } : f)))
            setDetail(prev => (prev ? { ...prev, ...meta } : prev))
        } catch (error: any) {
            toast.error(error.message || 'Dosya bilgileri kaydedilemedi')
        } finally {
            setSavingMeta(false)
        }
    }

    const toggleSelect = (file: MediaFile) => {
        setSelected(prev => (prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]))
    }

    const copyUrl = async (file: MediaFile) => {
        const fullUrl = getImageUrl(file.url)

        try {
            await navigator.clipboard.writeText(fullUrl)
            toast.success('Adres kopyalandı')
        } catch {
            toast.error('Kopyalanamadı, adresi elle seçebilirsiniz')
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files)
    }

    return (
        <>
            <Card>
                <CardHeader
                    title='Ortam Kütüphanesi'
                    subheader={total > 0 ? `${total} dosya` : undefined}
                    action={
                        <div className='flex gap-2'>
                            {selected.length > 0 && (
                                <Button
                                    color='error'
                                    variant='outlined'
                                    startIcon={<i className='ri-delete-bin-line' />}
                                    onClick={() => setDeleteTarget(files.filter(f => selected.includes(f.id)))}
                                >
                                    Seçilenleri Sil ({selected.length})
                                </Button>
                            )}
                            <Button
                                variant='contained'
                                startIcon={<i className='ri-upload-2-line' />}
                                onClick={() => inputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? 'Yükleniyor...' : 'Dosya Yükle'}
                            </Button>
                        </div>
                    }
                />

                <CardContent>
                    <Grid container spacing={4} className='mbe-4'>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth size='small'>
                                <InputLabel>Klasör</InputLabel>
                                <Select
                                    label='Klasör'
                                    value={folder}
                                    onChange={e => {
                                        setFolder(e.target.value)
                                        setPage(1)
                                        setSelected([])
                                    }}
                                >
                                    {Object.entries(FOLDERS).map(([key, label]) => (
                                        <MenuItem key={key} value={key}>{label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                            <TextField
                                fullWidth
                                size='small'
                                placeholder='Dosya adında ara'
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position='start'>
                                            <i className='ri-search-line' />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <FormControl fullWidth size='small'>
                                <InputLabel>Sıralama</InputLabel>
                                <Select
                                    label='Sıralama'
                                    value={sortBy}
                                    onChange={e => {
                                        setSortBy(e.target.value as 'date' | 'name')
                                        setPage(1)
                                    }}
                                >
                                    <MenuItem value='date'>Önce en yeni</MenuItem>
                                    <MenuItem value='name'>Dosya adı (A-Z)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    {/* Sürükle-bırak alanı: dosyalar buraya bırakılarak da yüklenir */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        style={{
                            border: `2px dashed ${dragActive ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-divider)'}`,
                            borderRadius: 8,
                            padding: 16,
                            minHeight: 240,
                            backgroundColor: dragActive ? 'var(--mui-palette-action-hover)' : 'transparent',
                            transition: 'background-color .2s, border-color .2s'
                        }}
                    >
                        {loading ? (
                            <div className='flex justify-center items-center' style={{ minHeight: 200 }}>
                                <CircularProgress />
                            </div>
                        ) : files.length === 0 ? (
                            <div className='flex flex-col items-center justify-center gap-2' style={{ minHeight: 200 }}>
                                <i className='ri-image-line text-4xl text-textDisabled' />
                                <Typography color='text.secondary'>
                                    {search ? 'Aramanıza uygun dosya bulunamadı' : 'Bu klasörde dosya yok'}
                                </Typography>
                                <Typography variant='body2' color='text.disabled'>
                                    Dosyaları buraya sürükleyip bırakabilirsiniz
                                </Typography>
                            </div>
                        ) : (
                            <Grid container spacing={3}>
                                {files.map(file => {
                                    const isSelected = selected.includes(file.id)

                                    return (
                                        <Grid key={file.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                                            <div
                                                onClick={() => setDetail(file)}
                                                style={{
                                                    position: 'relative',
                                                    border: `2px solid ${isSelected ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-divider)'}`,
                                                    borderRadius: 8,
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    backgroundColor: 'var(--mui-palette-action-hover)'
                                                }}
                                            >
                                                <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 2 }}>
                                                    <Checkbox
                                                        size='small'
                                                        checked={isSelected}
                                                        onClick={e => e.stopPropagation()}
                                                        onChange={() => toggleSelect(file)}
                                                        sx={{ bgcolor: 'background.paper', borderRadius: 1, p: '2px' }}
                                                    />
                                                </div>
                                                <img
                                                    src={getImageUrl(file.url)}
                                                    alt={file.filename}
                                                    loading='lazy'
                                                    style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                                                />
                                            </div>
                                            <Typography variant='body2' className='mbs-1 truncate' title={file.filename}>
                                                {file.filename}
                                            </Typography>
                                            <Typography variant='caption' color='text.disabled'>
                                                {formatSize(file.size)}
                                            </Typography>
                                        </Grid>
                                    )
                                })}
                            </Grid>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className='flex justify-center mbs-5'>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, value) => setPage(value)}
                                color='primary'
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Gizli dosya seçici */}
            <input
                ref={inputRef}
                type='file'
                accept='image/*'
                multiple
                hidden
                onChange={e => e.target.files && uploadFiles(e.target.files)}
            />

            {/* Detay paneli */}
            <Drawer anchor='right' open={Boolean(detail)} onClose={() => setDetail(null)}>
                {detail && (
                    <div style={{ width: 360, padding: 20 }}>
                        <div className='flex items-center justify-between mbe-4'>
                            <Typography variant='h6'>Dosya Detayı</Typography>
                            <IconButton size='small' onClick={() => setDetail(null)}>
                                <i className='ri-close-line' />
                            </IconButton>
                        </div>

                        {/* Önizleme: tıklayınca tam boy açılır */}
                        <Tooltip title='Büyütmek için tıklayın'>
                            <img
                                src={getImageUrl(detail.url)}
                                alt={detail.alt || detail.filename}
                                onClick={() => setZoom(true)}
                                style={{ width: '100%', borderRadius: 8, marginBottom: 16, cursor: 'zoom-in', backgroundColor: 'var(--mui-palette-action-hover)' }}
                            />
                        </Tooltip>

                        <Typography variant='body2' className='font-medium'>{detail.filename}</Typography>
                        <div className='flex gap-2 mbs-2'>
                            <Chip label={FOLDERS[detail.folder] || detail.folder} size='small' />
                            <Chip label={formatSize(detail.size)} size='small' variant='outlined' />
                        </div>
                        <Typography variant='caption' color='text.disabled' className='mbs-2 block'>
                            {formatDate(detail.uploadDate)}
                        </Typography>

                        <Divider className='mbs-4 mbe-4' />

                        {/* Düzenlenebilir bilgiler */}
                        <TextField
                            fullWidth
                            size='small'
                            label='Alternatif Metin (alt)'
                            value={meta.alt}
                            onChange={e => setMeta(prev => ({ ...prev, alt: e.target.value }))}
                            className='mbe-3'
                        />
                        <TextField
                            fullWidth
                            size='small'
                            label='Başlık'
                            value={meta.title}
                            onChange={e => setMeta(prev => ({ ...prev, title: e.target.value }))}
                            className='mbe-3'
                        />
                        <TextField
                            fullWidth
                            size='small'
                            multiline
                            minRows={2}
                            label='Açıklama'
                            value={meta.caption}
                            onChange={e => setMeta(prev => ({ ...prev, caption: e.target.value }))}
                            className='mbe-3'
                        />

                        <Button fullWidth variant='contained' onClick={saveMeta} disabled={savingMeta}>
                            {savingMeta ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
                        </Button>

                        <Divider className='mbs-4 mbe-4' />

                        <Typography variant='body2' color='text.secondary'>Adres</Typography>
                        <TextField
                            fullWidth
                            size='small'
                            value={getImageUrl(detail.url)}
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position='end'>
                                        <Tooltip title='Kopyala'>
                                            <IconButton size='small' onClick={() => copyUrl(detail)}>
                                                <i className='ri-file-copy-line' />
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Button
                            fullWidth
                            color='error'
                            variant='outlined'
                            className='mbs-5'
                            startIcon={<i className='ri-delete-bin-line' />}
                            onClick={() => setDeleteTarget([detail])}
                        >
                            Dosyayı Sil
                        </Button>
                    </div>
                )}
            </Drawer>

            {/* Tam boy önizleme */}
            <Dialog open={zoom} onClose={() => setZoom(false)} maxWidth='lg'>
                <DialogContent sx={{ p: 1, bgcolor: 'background.default' }}>
                    {detail && (
                        <img
                            src={getImageUrl(detail.url)}
                            alt={detail.alt || detail.filename}
                            onClick={() => setZoom(false)}
                            style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', cursor: 'zoom-out' }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Silme onayı */}
            <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Dosyayı Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {deleteTarget && deleteTarget.length > 1
                            ? `${deleteTarget.length} dosya kalıcı olarak silinecek. Emin misiniz?`
                            : `"${deleteTarget?.[0]?.filename}" kalıcı olarak silinecek. Emin misiniz?`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color='secondary' onClick={() => setDeleteTarget(null)}>İptal</Button>
                    <Button color='error' variant='contained' onClick={confirmDelete}>Sil</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default MediaGallery
