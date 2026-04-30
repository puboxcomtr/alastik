'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'react-toastify'

/* MUI */
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

/* Data */
import { TEMPLATE_CATEGORIES, type TemplateItem } from './templatesData'

/* Monaco Editor - SSR uyumsuz, dynamic import */
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Editör yükleniyor...</Typography>
        </Box>
    )
})

const MailTemplatesEditor = () => {
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        genel: true,
        admin: true,
        uye: true
    })

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('genel')
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('siparis_sablonu')

    // Şablonlardaki içerikleri lokal state'te tutuyoruz (her şablonun kendi içeriği)
    const [contents, setContents] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}

        TEMPLATE_CATEGORIES.forEach(cat => {
            cat.templates.forEach(tpl => {
                initial[tpl.id] = tpl.defaultContent
            })
        })

        return initial
    })

    const selectedCategory = useMemo(
        () => TEMPLATE_CATEGORIES.find(c => c.id === selectedCategoryId),
        [selectedCategoryId]
    )

    const selectedTemplate: TemplateItem | undefined = useMemo(
        () => selectedCategory?.templates.find(t => t.id === selectedTemplateId),
        [selectedCategory, selectedTemplateId]
    )

    const toggleCategory = (categoryId: string) => {
        setOpenCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
    }

    const handleSelectTemplate = (categoryId: string, templateId: string) => {
        setSelectedCategoryId(categoryId)
        setSelectedTemplateId(templateId)
    }

    const handleEditorChange = (value: string | undefined) => {
        if (selectedTemplate) {
            setContents(prev => ({ ...prev, [selectedTemplate.id]: value || '' }))
        }
    }

    const handleResetTemplate = () => {
        if (!selectedTemplate) return

        if (!confirm('Şablon varsayılan haline döndürülecek. Devam edilsin mi?')) return

        setContents(prev => ({ ...prev, [selectedTemplate.id]: selectedTemplate.defaultContent }))
        toast.success('Şablon sıfırlandı')
    }

    const breadcrumb = useMemo(() => {
        if (!selectedCategory || !selectedTemplate) return ''

        return `${selectedCategory.name} > ${selectedTemplate.name}`
    }, [selectedCategory, selectedTemplate])

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Typography variant='h4'>Mail Şablonları</Typography>
            </Grid>

            {/* Sol Taraf: Kategori ve Şablon Listesi */}
            <Grid size={{ xs: 12, md: 3 }}>
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        {TEMPLATE_CATEGORIES.map(category => (
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
                                            const isSelected =
                                                selectedCategoryId === category.id && selectedTemplateId === template.id

                                            return (
                                                <Box
                                                    key={template.id}
                                                    onClick={() => handleSelectTemplate(category.id, template.id)}
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
                                                        sx={{ fontSize: '13px', color: isSelected ? '#FFF' : 'inherit' }}
                                                    >
                                                        {template.name}
                                                    </Typography>
                                                </Box>
                                            )
                                        })}
                                    </Box>
                                </Collapse>

                                <Divider />
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            </Grid>

            {/* Sağ Taraf: Editör */}
            <Grid size={{ xs: 12, md: 9 }}>
                <Card>
                    <CardHeader
                        title={
                            <Typography variant='body1' color='text.secondary'>
                                {breadcrumb}
                            </Typography>
                        }
                    />
                    <Divider />
                    <CardContent sx={{ p: 0 }}>
                        {selectedTemplate ? (
                            <MonacoEditor
                                height='700px'
                                defaultLanguage='html'
                                language='html'
                                value={contents[selectedTemplate.id] || ''}
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
        </Grid>
    )
}

export default MailTemplatesEditor