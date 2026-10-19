'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'react-toastify'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Editör yükleniyor...</Typography>
        </Box>
    )
})

type TemplateListItem = {
    id: string
    templateKey: string
    name: string
    hasCustomContent: boolean
}

type TemplateCategory = {
    id: string
    name: string
    icon: string
    templates: TemplateListItem[]
}

type TemplateDetail = {
    id: string
    templateKey: string
    name: string
    category: string
    categoryName: string
    content: string
    defaultContent: string
}

const MailTemplatesEditor = () => {
    const [categories, setCategories] = useState<TemplateCategory[]>([])
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})

    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null)

    const [editorContent, setEditorContent] = useState<string>('')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    const [loading, setLoading] = useState(true)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [saving, setSaving] = useState(false)
    const [resetting, setResetting] = useState(false)

    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [previewHtml, setPreviewHtml] = useState<string>('')

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.mailTemplates.list())

                if (res.success && Array.isArray(res.data)) {
                    setCategories(res.data)

                    const opens: Record<string, boolean> = {}

                    res.data.forEach((cat: TemplateCategory) => {
                        opens[cat.id] = true
                    })

                    setOpenCategories(opens)

                    const firstCategory = res.data[0]

                    if (firstCategory && firstCategory.templates.length > 0) {
                        setSelectedTemplateId(firstCategory.templates[0].id)
                    }
                }
            } catch {
                toast.error('Şablonlar yüklenemedi')
            } finally {
                setLoading(false)
            }
        }

        loadCategories()
    }, [])

    useEffect(() => {
        if (!selectedTemplateId) return

        const loadDetail = async () => {
            setLoadingDetail(true)

            try {
                const res = await fetchAPI(API_ENDPOINTS.mailTemplates.detail(selectedTemplateId))

                if (res.success && res.data) {
                    setSelectedTemplate(res.data)
                    setEditorContent(res.data.content || '')
                    setHasUnsavedChanges(false)
                }
            } catch {
                toast.error('Şablon detayı yüklenemedi')
            } finally {
                setLoadingDetail(false)
            }
        }

        loadDetail()
    }, [selectedTemplateId])

    const toggleCategory = (categoryId: string) => {
        setOpenCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
    }

    const handleSelectTemplate = (templateId: string) => {
        if (hasUnsavedChanges) {
            if (!confirm('Kaydedilmemiş değişiklikleriniz var. Devam edilsin mi?')) {
                return
            }
        }

        setSelectedTemplateId(templateId)
    }

    const handleEditorChange = (value: string | undefined) => {
        const newContent = value || ''

        setEditorContent(newContent)

        if (selectedTemplate) {
            setHasUnsavedChanges(newContent !== selectedTemplate.content)
        }
    }

    const handleSave = async () => {
        if (!selectedTemplate) return

        setSaving(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.mailTemplates.update(selectedTemplate.id), {
                method: 'PATCH',
                body: JSON.stringify({ content: editorContent })
            })

            if (res.success) {
                toast.success('Şablon kaydedildi')
                setSelectedTemplate({ ...selectedTemplate, content: editorContent })
                setHasUnsavedChanges(false)

                setCategories(prev =>
                    prev.map(cat => ({
                        ...cat,
                        templates: cat.templates.map(t =>
                            t.id === selectedTemplate.id
                                ? { ...t, hasCustomContent: editorContent !== selectedTemplate.defaultContent }
                                : t
                        )
                    }))
                )
            } else {
                toast.error(res.message || 'Kayıt başarısız')
            }
        } catch {
            toast.error('Kayıt sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleReset = async () => {
        if (!selectedTemplate) return

        if (!confirm('Şablon varsayılan haline döndürülecek. Devam edilsin mi?')) return

        setResetting(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.mailTemplates.reset(selectedTemplate.id), {
                method: 'POST'
            })

            if (res.success) {
                toast.success('Şablon sıfırlandı')
                setEditorContent(res.data.content)
                setSelectedTemplate({ ...selectedTemplate, content: res.data.content })
                setHasUnsavedChanges(false)

                setCategories(prev =>
                    prev.map(cat => ({
                        ...cat,
                        templates: cat.templates.map(t =>
                            t.id === selectedTemplate.id
                                ? { ...t, hasCustomContent: false }
                                : t
                        )
                    }))
                )
            } else {
                toast.error(res.message || 'Sıfırlama başarısız')
            }
        } catch {
            toast.error('Sıfırlama sırasında hata oluştu')
        } finally {
            setResetting(false)
        }
    }

    const handlePreview = async () => {
        if (!selectedTemplate) return

        setPreviewLoading(true)
        setPreviewOpen(true)
        setPreviewHtml('')

        try {
            const res = await fetchAPI(API_ENDPOINTS.mailTemplates.preview(selectedTemplate.id), {
                method: 'POST',
                body: JSON.stringify({ content: editorContent })
            })

            if (res.success && res.data?.html) {
                setPreviewHtml(res.data.html)
            } else {
                toast.error(res.message || 'Önizleme oluşturulamadı')
                setPreviewOpen(false)
            }
        } catch {
            toast.error('Önizleme sırasında hata oluştu')
            setPreviewOpen(false)
        } finally {
            setPreviewLoading(false)
        }
    }

    const handleClosePreview = () => {
        setPreviewOpen(false)
        setPreviewHtml('')
    }

    const breadcrumb = useMemo(() => {
        if (!selectedTemplate) return ''

        return `${selectedTemplate.categoryName} > ${selectedTemplate.name}`
    }, [selectedTemplate])

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography>Şablonlar yükleniyor...</Typography>
            </Box>
        )
    }

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Typography variant='h4'>Mail Şablonları</Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        {categories.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color='text.secondary'>Şablon bulunamadı</Typography>
                            </Box>
                        ) : (
                            categories.map(category => (
                                <Box key={category.id}>
                                    <Box
                                        onClick={() => toggleCategory(category.id)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            p: 3,
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <i className={category.icon} style={{ fontSize: '20px' }} />
                                        <Typography variant='body1' fontWeight='bold' sx={{ flexGrow: 1 }}>
                                            {category.name}
                                        </Typography>
                                        <i
                                            className={openCategories[category.id] ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}
                                            style={{ fontSize: '18px' }}
                                        />
                                    </Box>

                                    <Collapse in={openCategories[category.id]}>
                                        <Box sx={{ pl: 4, pb: 2 }}>
                                            {category.templates.map(template => {
                                                const isSelected = selectedTemplateId === template.id

                                                return (
                                                    <Box
                                                        key={template.id}
                                                        onClick={() => handleSelectTemplate(template.id)}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                            p: 2,
                                                            cursor: 'pointer',
                                                            borderRadius: 1,
                                                            mr: 2,
                                                            bgcolor: isSelected ? '#e2001a' : 'transparent',
                                                            color: isSelected ? '#FFF !important' : 'text.primary',
                                                            '&:hover': {
                                                                bgcolor: isSelected ? '#e2001a' : 'action.hover'
                                                            }
                                                        }}
                                                    >
                                                        <i className='ri-file-text-line' style={{ fontSize: '16px' }} />
                                                        <Typography
                                                            variant='body2'
                                                            sx={{
                                                                fontSize: '13px',
                                                                color: isSelected ? '#FFF' : 'inherit',
                                                                flexGrow: 1
                                                            }}
                                                        >
                                                            {template.name}
                                                        </Typography>
                                                        {template.hasCustomContent && (
                                                            <Box
                                                                sx={{
                                                                    width: 6,
                                                                    height: 6,
                                                                    borderRadius: '50%',
                                                                    bgcolor: isSelected ? '#FFF' : '#1976d2'
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    </Collapse>

                                    <Divider />
                                </Box>
                            ))
                        )}
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 9 }}>
                <Card>
                    <CardHeader
                        title={
                            <Typography variant='body1' color='text.secondary'>
                                {breadcrumb || 'Soldan bir şablon seçiniz'}
                            </Typography>
                        }
                        action={
                            selectedTemplate && (
                                <div className='flex gap-2'>
                                    <Button
                                        variant='outlined'
                                        color='info'
                                        onClick={handlePreview}
                                        disabled={previewLoading || saving || resetting}
                                        startIcon={previewLoading ? <CircularProgress size={16} /> : <i className='ri-eye-line' />}
                                    >
                                        {previewLoading ? 'Yükleniyor...' : 'Test Görüntüle'}
                                    </Button>
                                    <Button
                                        variant='outlined'
                                        color='warning'
                                        onClick={handleReset}
                                        disabled={resetting || saving}
                                        startIcon={resetting ? <CircularProgress size={16} /> : <i className='ri-refresh-line' />}
                                    >
                                        {resetting ? 'Sıfırlanıyor...' : 'Şablonu Sıfırla'}
                                    </Button>
                                    <Button
                                        variant='contained'
                                        onClick={handleSave}
                                        disabled={saving || resetting || !hasUnsavedChanges}
                                        startIcon={saving ? <CircularProgress size={16} /> : <i className='ri-save-line' />}
                                    >
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                </div>
                            )
                        }
                    />
                    <Divider />
                    <CardContent sx={{ p: 0 }}>
                        {loadingDetail ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', gap: 2 }}>
                                <CircularProgress size={24} />
                                <Typography>Şablon yükleniyor...</Typography>
                            </Box>
                        ) : selectedTemplate ? (
                            <MonacoEditor
                                height='700px'
                                defaultLanguage='html'
                                language='html'
                                value={editorContent}
                                onChange={handleEditorChange}
                                theme='vs-light'
                                options={{
                                    fontSize: 14,
                                    minimap: { enabled: true },
                                    scrollBeyondLastLine: false,
                                    wordWrap: 'on',
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all',
                                    automaticLayout: true,
                                    tabSize: 4,
                                    formatOnPaste: true
                                }}
                            />
                        ) : (
                            <Box sx={{ p: 6, textAlign: 'center' }}>
                                <Typography color='text.secondary'>Soldan bir şablon seçiniz</Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            <Dialog
                open={previewOpen}
                onClose={handleClosePreview}
                maxWidth='md'
                fullWidth
                PaperProps={{ sx: { height: '90vh' } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant='h6'>
                        Şablon Önizleme {selectedTemplate ? `- ${selectedTemplate.name}` : ''}
                    </Typography>
                    <IconButton onClick={handleClosePreview} size='small'>
                        <i className='ri-close-line' />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
                    {previewLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
                            <CircularProgress size={24} />
                            <Typography>Önizleme oluşturuluyor...</Typography>
                        </Box>
                    ) : (
                        <iframe
                            srcDoc={previewHtml}
                            title='Şablon Önizleme'
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: 'block'
                            }}
                            sandbox='allow-same-origin'
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClosePreview} variant='outlined'>
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>
        </Grid>
    )
}

export default MailTemplatesEditor