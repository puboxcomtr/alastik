'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    TextField,
    Grid,
    Box,
    Typography,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Pagination,
    SelectChangeEvent
} from '@mui/material'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'

interface MediaFile {
    id: string
    filename: string
    url: string
    size: number
    uploadDate: string
    folder: string
}

interface MediaLibraryProps {
    open: boolean
    onClose: () => void
    onSelect: (files: MediaFile[]) => void
    multiple?: boolean
    folder?: string
    allowedTypes?: string[]
    maxFileSize?: number
    title?: string
    maxSelection?: number
}

interface ApiResponse<T> {
    success: boolean
    message?: string
    files?: T[]
    folders?: string[]
    total?: number
    page?: number
    totalPages?: number
}

const MEDIA_FOLDERS = {
    urun: 'Ürün Görselleri',
    kategori: 'Kategori Görselleri',
    marka: 'Marka Görselleri',
    general: 'Genel'
} as const

type FolderKey = keyof typeof MEDIA_FOLDERS

const MediaLibrary = ({
    open,
    onClose,
    onSelect,
    multiple = true,
    folder = 'urun',
    allowedTypes = ['image/*'],
    maxFileSize = 10 * 1024 * 1024, // 10MB
    title = 'Media Kütüphanesi',
    maxSelection = 10
}: MediaLibraryProps) => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
    const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [folders, setFolders] = useState<string[]>([])
    const [currentFolder, setCurrentFolder] = useState<FolderKey>(folder as FolderKey)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [error, setError] = useState<string | null>(null)

    // API Base URL
    const API_BASE_URL = 'http://localhost:3082'
    const getApiUrl = useCallback((endpoint: string) =>
        `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, [])

    // API çağrıları
    const apiCall = useCallback(async <T,>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers
                },
                ...options
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()
            return data
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
            throw new Error(message)
        }
    }, [])

    // Medya dosyalarını getir
    const fetchMediaFiles = useCallback(async (searchQuery = '', page = 1) => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({
                folder: currentFolder,
                search: searchQuery,
                limit: '24', // 6 sütunlu grid için 24 görsel
                page: page.toString(),
                sortBy: 'date',
                sortOrder: 'desc'
            })

            const data = await apiCall<MediaFile>(getApiUrl(`/api/media/list?${params}`))

            if (data.success && data.files) {
                setMediaFiles(data.files)
                setTotalPages(data.totalPages || 1)
            } else {
                throw new Error(data.message || 'Dosyalar yüklenemedi')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bağlantı hatası'
            setError(message)
            setMediaFiles([])
            setTotalPages(1)
        } finally {
            setLoading(false)
        }
    }, [currentFolder, apiCall, getApiUrl])

    // Klasörleri getir
    const fetchFolders = useCallback(async () => {
        try {
            const data = await apiCall<never>(getApiUrl('/api/media/folders'))

            if (data.success && data.folders) {
                setFolders(data.folders)
            }
        } catch (error) {
            // Klasör yüklemede hata olsa da devam et
            setFolders(Object.keys(MEDIA_FOLDERS))
        }
    }, [apiCall, getApiUrl])

    // Effects
    useEffect(() => {
        if (open) {
            fetchMediaFiles('', 1)
            fetchFolders()
            setCurrentPage(1)
        }
    }, [open, currentFolder, fetchMediaFiles, fetchFolders])

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            if (currentPage === 1) {
                fetchMediaFiles(searchTerm, 1)
            } else {
                setCurrentPage(1) // Reset to first page on search
            }
        }, 500)

        return () => clearTimeout(delayedSearch)
    }, [searchTerm, fetchMediaFiles, currentPage])

    useEffect(() => {
        if (currentPage > 1) {
            fetchMediaFiles(searchTerm, currentPage)
        }
    }, [currentPage, fetchMediaFiles, searchTerm])

    // Event handlers
    const handleFolderChange = (event: SelectChangeEvent) => {
        const newFolder = event.target.value as FolderKey
        setCurrentFolder(newFolder)
        setSelectedFiles([])
        setCurrentPage(1)
    }

    const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
        setCurrentPage(page)
    }

    const handleFileSelect = (file: MediaFile) => {
        if (multiple) {
            setSelectedFiles(prev => {
                const isSelected = prev.find(f => f.id === file.id)
                if (isSelected) {
                    return prev.filter(f => f.id !== file.id)
                } else {
                    if (prev.length >= maxSelection) {
                        toast.warning(`Maksimum ${maxSelection} dosya seçebilirsiniz`)
                        return prev
                    }
                    return [...prev, file]
                }
            })
        } else {
            setSelectedFiles([file])
        }
    }

    // Dosya yükleme
    const uploadFiles = async (files: File[]) => {
        if (files.length === 0) return

        setUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            files.forEach(file => {
                formData.append('files', file)
            })

            const response = await fetch(getApiUrl(`/api/media/upload?folder=${currentFolder}`), {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error(`Upload hatası: ${response.status}`)
            }

            const data: ApiResponse<MediaFile> = await response.json()

            if (data.success) {
                toast.success(`${files.length} dosya başarıyla yüklendi`)
                await fetchMediaFiles(searchTerm, currentPage) // Listeyi yenile
            } else {
                throw new Error(data.message || 'Upload hatası')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Dosya yüklenirken hata oluştu'
            setError(message)
            toast.error(message)
        } finally {
            setUploading(false)
        }
    }

    // Dropzone
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: allowedTypes.reduce((acc, type) => {
            acc[type] = []
            return acc
        }, {} as Record<string, string[]>),
        maxSize: maxFileSize,
        onDrop: uploadFiles,
        multiple: true,
        disabled: uploading
    })

    // Seçilenleri onayla
    const handleConfirm = () => {
        if (selectedFiles.length === 0) {
            toast.warning('Lütfen en az bir dosya seçin')
            return
        }

        onSelect(selectedFiles)
        setSelectedFiles([])
        onClose()
    }

    // Utility functions
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: { height: '95vh', maxWidth: '1400px' }
            }}
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{title}</Typography>
                    <IconButton onClick={onClose}>
                        <i className='ri-close-line' />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Hata gösterimi */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Kontroller */}
                <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* Klasör seçimi */}
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Klasör</InputLabel>
                                <Select
                                    value={currentFolder}
                                    onChange={handleFolderChange}
                                    label="Klasör"
                                >
                                    {folders.map(folderKey => (
                                        <MenuItem key={folderKey} value={folderKey}>
                                            {MEDIA_FOLDERS[folderKey as FolderKey] || folderKey}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Arama */}
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Görsel ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <i className='ri-search-line' style={{ marginRight: 8, color: '#666' }} />
                                }}
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* Upload Area */}
                <Box
                    {...getRootProps()}
                    sx={{
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'grey.300',
                        borderRadius: 2,
                        p: 3,
                        mb: 3,
                        textAlign: 'center',
                        backgroundColor: isDragActive ? 'primary.light' : 'grey.50',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: uploading ? 0.7 : 1
                    }}
                >
                    <input {...getInputProps()} />
                    {uploading ? (
                        <Box>
                            <CircularProgress size={40} />
                            <Typography sx={{ mt: 1 }}>Yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Box>
                            <i className='ri-upload-cloud-line' style={{ fontSize: 48, color: '#666' }} />
                            <Typography variant="h6" sx={{ mt: 1 }}>
                                {isDragActive ? 'Dosyaları buraya bırakın' : 'Dosya yüklemek için tıklayın veya sürükleyin'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Maksimum dosya boyutu: {formatFileSize(maxFileSize)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                Klasör: {MEDIA_FOLDERS[currentFolder]}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Seçilen dosyalar */}
                {selectedFiles.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Seçilen Dosyalar ({selectedFiles.length}{multiple ? `/${maxSelection}` : ''})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {selectedFiles.map((file) => (
                                <Chip
                                    key={file.id}
                                    label={file.filename.length > 20 ? file.filename.substring(0, 20) + '...' : file.filename}
                                    onDelete={() => handleFileSelect(file)}
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Dosya listesi - 6 Sütunlu Grid */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Grid container spacing={2}>
                            {mediaFiles.map((file) => {
                                const isSelected = selectedFiles.find(f => f.id === file.id)
                                return (
                                    <Grid item xs={2} key={file.id}>
                                        <Box
                                            onClick={() => handleFileSelect(file)}
                                            sx={{
                                                position: 'relative',
                                                cursor: 'pointer',
                                                border: isSelected ? '3px solid' : '1px solid',
                                                borderColor: isSelected ? 'primary.main' : 'grey.300',
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    transform: 'scale(1.02)'
                                                }
                                            }}
                                        >
                                            {/* Kare görsel container */}
                                            <Box
                                                sx={{
                                                    aspectRatio: '1',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <img
                                                    src={`/api/proxy-image?url=${encodeURIComponent(file.url)}`}
                                                    alt={file.filename}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.src = '/placeholder-image.png' // Fallback image
                                                    }}
                                                />

                                                {isSelected && (
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 8,
                                                            right: 8,
                                                            backgroundColor: 'primary.main',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            width: 24,
                                                            height: 24,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <i className='ri-check-line' style={{ fontSize: '14px' }} />
                                                    </Box>
                                                )}
                                            </Box>

                                            {/* Alt bilgi paneli - Beyaz arkaplan */}
                                            <Box
                                                sx={{
                                                    backgroundColor: 'white',
                                                    p: 1.5,
                                                    borderTop: '1px solid',
                                                    borderColor: 'grey.200'
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{
                                                        fontWeight: 'medium',
                                                        fontSize: '0.75rem',
                                                        mb: 0.5
                                                    }}
                                                    title={file.filename}
                                                >
                                                    {file.filename}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: '0.65rem',
                                                        display: 'block'
                                                    }}
                                                >
                                                    {formatFileSize(file.size)}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: '0.65rem',
                                                        display: 'block'
                                                    }}
                                                >
                                                    {formatDate(file.uploadDate)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )
                            })}
                        </Grid>

                        {/* Sayfalama */}
                        {totalPages > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Pagination
                                    count={totalPages}
                                    page={currentPage}
                                    onChange={handlePageChange}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </>
                )}

                {mediaFiles.length === 0 && !loading && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <i className='ri-image-line' style={{ fontSize: 64, color: '#ccc' }} />
                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                            {searchTerm ? 'Arama sonucu bulunamadı' : `${MEDIA_FOLDERS[currentFolder]} klasöründe henüz dosya yok`}
                        </Typography>
                        {!searchTerm && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Dosya yüklemek için yukarıdaki alana tıklayın veya dosyaları sürükleyin
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    İptal
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={selectedFiles.length === 0}
                >
                    Seç ({selectedFiles.length})
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default MediaLibrary