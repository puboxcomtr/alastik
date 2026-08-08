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
import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@/libs/api'

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

interface ApiResponse {
    success: boolean
    message?: string
    files?: MediaFile[]
    folders?: string[]
    total?: number
    page?: number
    totalPages?: number
}

const MEDIA_FOLDERS = {
    urun: 'Ürün Görselleri',
    kategori: 'Kategori Görselleri',
    marka: 'Marka Görselleri',
    blog: 'Blog Görselleri',
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
    maxFileSize = 10 * 1024 * 1024,
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
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    // Medya dosyalarını getir
    const fetchMediaFiles = useCallback(async (searchQuery = '', page = 1, forceRefresh = false) => {
        setLoading(true)
        setError(null)

        try {
            const url = API_ENDPOINTS.media.list({
                folder: currentFolder,
                search: searchQuery,
                page,
                limit: 24,
                sortBy: 'date',
                sortOrder: 'desc'
            })

            const timestamp = forceRefresh ? `&_t=${Date.now()}` : ''
            const data: ApiResponse = await fetchAPI(`${url}${timestamp}`)

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
    }, [currentFolder])

    // Klasörleri getir
    const fetchFolders = useCallback(async () => {
        try {
            const data: ApiResponse = await fetchAPI(API_ENDPOINTS.media.folders())

            if (data.success && data.folders) {
                setFolders(data.folders)
            }
        } catch (error) {
            setFolders(Object.keys(MEDIA_FOLDERS))
        }
    }, [])

    // Effects
    useEffect(() => {
        if (open) {
            setCurrentPage(1)
            setSearchTerm('')
            setSelectedFiles([])
            fetchMediaFiles('', 1, true)
            fetchFolders()
        }
    }, [open, currentFolder, fetchMediaFiles, fetchFolders, refreshTrigger])

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            if (currentPage === 1) {
                fetchMediaFiles(searchTerm, 1)
            } else {
                setCurrentPage(1)
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
        setRefreshTrigger(prev => prev + 1)
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
            setSelectedFiles(prev => {
                const isSelected = prev.find(f => f.id === file.id)
                if (isSelected) {
                    return []
                } else {
                    return [file]
                }
            })
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

            const data: ApiResponse = await fetchAPI(API_ENDPOINTS.media.upload(currentFolder), {
                method: 'POST',
                body: formData
            })

            if (data.success) {
                toast.success(`${files.length} dosya başarıyla yüklendi`)

                setSearchTerm('')
                setCurrentPage(1)
                setSelectedFiles([])

                setTimeout(() => {
                    setRefreshTrigger(prev => prev + 1)
                    fetchMediaFiles('', 1, true)
                }, 1000)

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
    const handleDeleteFile = async (fileId: string, fileName: string) => {
        if (!confirm(`"${fileName}" dosyasını kalıcı olarak silmek istediğinize emin misiniz?`)) {
            return
        }
        try {
            const data = await fetchAPI(API_ENDPOINTS.media.delete(fileId), {
                method: 'DELETE'
            })

            if (data.success) {
                toast.success('Dosya başarıyla silindi')
                setSelectedFiles(prev => prev.filter(f => f.id !== fileId))
                fetchMediaFiles(searchTerm, currentPage)
            } else {
                throw new Error(data.message || 'Silme hatası')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Dosya silinirken hata oluştu'
            toast.error(message)
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
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
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
                            <Typography sx={{ mt: 1 }}>Yükleniyor ve WebP dönüştürülüyor...</Typography>
                        </Box>
                    ) : (
                        <Box>
                            <i className='ri-upload-cloud-line' style={{ fontSize: 48, color: '#666' }} />
                            <Typography variant="h6" sx={{ mt: 1 }}>
                                {isDragActive ? 'Dosyaları buraya bırakın' : 'Dosya yüklemek için tıklayın veya sürükleyin'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                Klasör: {MEDIA_FOLDERS[currentFolder]} • Sadece WebP gösterilir
                            </Typography>
                        </Box>
                    )}
                </Box>

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
                                                    transform: 'scale(1.02)',
                                                    '& .delete-button': {
                                                        opacity: 1
                                                    }
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    aspectRatio: '1',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <img
                                                    src={getImageUrl(file.url)}
                                                    alt={file.filename}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.src = '/placeholder-image.png'
                                                    }}
                                                />

                                                {/* Seçim işareti */}
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
                                                            justifyContent: 'center',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <i className='ri-check-line' style={{ fontSize: '14px' }} />
                                                    </Box>
                                                )}
                                                {/* Silme butonu */}
                                                <IconButton
                                                    className="delete-button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteFile(file.id, file.filename)
                                                    }}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        left: 8,
                                                        backgroundColor: 'error.main',
                                                        color: 'white',
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s',
                                                        zIndex: 2,
                                                        '&:hover': {
                                                            backgroundColor: 'error.dark'
                                                        }
                                                    }}
                                                    size="small"
                                                >
                                                    <i className='ri-delete-bin-line' style={{ fontSize: '14px' }} />
                                                </IconButton>
                                                {/* Seçim için tıklama alanı */}
                                                <Box
                                                    onClick={() => handleFileSelect(file)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0,
                                                        zIndex: 1
                                                    }}
                                                />
                                            </Box>

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
                            {searchTerm ? 'Arama sonucu bulunamadı' : `${MEDIA_FOLDERS[currentFolder]} klasöründe henüz WebP dosya yok`}
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