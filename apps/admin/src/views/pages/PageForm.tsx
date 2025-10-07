'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/* MUI */
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

/* Editor */
import classnames from 'classnames'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'

/* Toast */
import { toast } from 'react-toastify'

/* API */
import { createPage, updatePage, type PageType } from '@/utils/api/pages'

/* Components */
import CustomIconButton from '@core/components/mui/IconButton'

/* Styles */
import '@/libs/styles/tiptapEditor.css'

interface PageFormProps {
    page?: PageType
    isEdit?: boolean
}

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null

    return (
        <div className='flex flex-wrap gap-x-3 gap-y-1 pbs-5 pbe-4 pli-5'>
            <CustomIconButton
                {...(editor.isActive('heading', { level: 2 }) && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <i className={classnames('ri-h-2', { 'text-textSecondary': !editor.isActive('heading', { level: 2 }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('heading', { level: 3 }) && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                <i className={classnames('ri-h-3', { 'text-textSecondary': !editor.isActive('heading', { level: 3 }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('bold') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <i className={classnames('ri-bold', { 'text-textSecondary': !editor.isActive('bold') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('italic') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <i className={classnames('ri-italic', { 'text-textSecondary': !editor.isActive('italic') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('bulletList') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <i className={classnames('ri-list-unordered', { 'text-textSecondary': !editor.isActive('bulletList') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('orderedList') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <i className={classnames('ri-list-ordered', { 'text-textSecondary': !editor.isActive('orderedList') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive({ textAlign: 'left' }) && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
                <i className={classnames('ri-align-left', { 'text-textSecondary': !editor.isActive({ textAlign: 'left' }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive({ textAlign: 'center' }) && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
                <i className={classnames('ri-align-center', { 'text-textSecondary': !editor.isActive({ textAlign: 'center' }) })} />
            </CustomIconButton>
        </div>
    )
}

const PageForm = ({ page, isEdit = false }: PageFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        title: page?.title || '',
        slug: page?.slug || '',
        excerpt: page?.excerpt || '',
        status: page?.status || 'published',
        template: page?.template || 'default',
        seo: {
            metaTitle: page?.seo?.metaTitle || '',
            metaDescription: page?.seo?.metaDescription || '',
            metaKeywords: page?.seo?.metaKeywords?.join(', ') || ''
        }
    })

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Sayfa içeriğini giriniz...'
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph']
            }),
            Underline
        ],
        immediatelyRender: false,
        content: page?.content || ''
    })

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
    }

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value
        setFormData(prev => ({
            ...prev,
            title,
            slug: !isEdit ? generateSlug(title) : prev.slug
        }))
    }

    const handleAutoGenerateSeoUrl = () => {
        if (!formData.title || formData.title.trim() === '') {
            toast.error('Lütfen önce başlık alanını doldurun')
            return
        }

        const generatedUrl = generateSlug(formData.title)

        setFormData(prev => ({
            ...prev,
            slug: generatedUrl
        }))

        toast.success('SEO URL otomatik oluşturuldu')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.slug) {
            toast.error('Başlık ve slug alanları zorunludur')
            return
        }

        const content = editor?.getHTML() || ''

        if (!content || content === '<p></p>') {
            toast.error('İçerik boş bırakılamaz')
            return
        }

        setLoading(true)

        try {
            const pageData = {
                title: formData.title,
                slug: formData.slug,
                content,
                excerpt: formData.excerpt,
                status: formData.status,
                template: formData.template,
                seo: {
                    metaTitle: formData.seo.metaTitle,
                    metaDescription: formData.seo.metaDescription,
                    metaKeywords: formData.seo.metaKeywords.split(',').map(k => k.trim()).filter(Boolean)
                }
            }

            if (isEdit && page) {
                await updatePage(page._id, pageData)
                toast.success('Sayfa güncellendi')
            } else {
                await createPage(pageData)
                toast.success('Sayfa oluşturuldu')
            }

            router.push('/tr/apps/pages/list')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6}>
                {/* Header */}
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-y-4'>
                        <Typography variant='h4'>
                            {isEdit ? 'Sayfa Düzenle' : 'Yeni Sayfa Ekle'}
                        </Typography>
                        <div className='flex gap-4'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.push('/tr/apps/pages/list')}
                                disabled={loading}
                            >
                                İptal
                            </Button>
                            <Button
                                type='submit'
                                variant='contained'
                                disabled={loading}
                            >
                                {loading ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                        </div>
                    </div>
                </Grid>

                {/* Sol Kolon */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6}>
                        {/* Temel Bilgiler */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Genel Bilgiler
                                    </Typography>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Sayfa Başlığı'
                                                placeholder='Örn: Hakkımızda'
                                                value={formData.title}
                                                onChange={handleTitleChange}
                                                required
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Kısa Açıklama'
                                                placeholder='Sayfanın kısa özeti'
                                                multiline
                                                rows={3}
                                                value={formData.excerpt}
                                                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* İçerik Editörü */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Sayfa İçeriği
                                    </Typography>
                                    <Card className='p-0 border shadow-none'>
                                        <CardContent className='p-0'>
                                            <EditorToolbar editor={editor} />
                                            <Divider className='mli-5' />
                                            <EditorContent
                                                editor={editor}
                                                className='overflow-y-auto flex'
                                                style={{ minHeight: '400px', maxHeight: '600px' }}
                                            />
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Sağ Kolon */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Grid container spacing={6}>
                        {/* Durum ve Şablon */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <FormControl fullWidth>
                                                <InputLabel>Durum</InputLabel>
                                                <Select
                                                    value={formData.status}
                                                    label='Durum'
                                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                                >
                                                    <MenuItem value='published'>Yayında</MenuItem>
                                                    <MenuItem value='draft'>Taslak</MenuItem>
                                                    <MenuItem value='archived'>Arşivlendi</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <FormControl fullWidth>
                                                <InputLabel>Şablon</InputLabel>
                                                <Select
                                                    value={formData.template}
                                                    label='Şablon'
                                                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value as any }))}
                                                >
                                                    <MenuItem value='default'>Varsayılan</MenuItem>
                                                    <MenuItem value='full-width'>Tam Genişlik</MenuItem>
                                                    <MenuItem value='landing'>Landing</MenuItem>
                                                    <MenuItem value='contact'>İletişim</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* SEO */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        SEO Bilgileri
                                    </Typography>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO Başlık'
                                                placeholder='Sayfa için SEO başlığı'
                                                value={formData.seo.metaTitle}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    seo: { ...prev.seo, metaTitle: e.target.value }
                                                }))}
                                            />
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    display: 'block',
                                                    mt: 1,
                                                    textAlign: 'right',
                                                    color: formData.seo.metaTitle.length > 60 ? 'error.main' : 'success.main'
                                                }}
                                            >
                                                {formData.seo.metaTitle.length} / 60 karakter
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='SEO Açıklama'
                                                placeholder='Sayfa için SEO açıklaması'
                                                multiline
                                                rows={3}
                                                value={formData.seo.metaDescription}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    seo: { ...prev.seo, metaDescription: e.target.value }
                                                }))}
                                            />
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    display: 'block',
                                                    mt: 1,
                                                    textAlign: 'right',
                                                    color: formData.seo.metaDescription.length > 160 ? 'error.main' : 'success.main'
                                                }}
                                            >
                                                {formData.seo.metaDescription.length} / 160 karakter
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Slug (URL)'
                                                placeholder='hakkimizda'
                                                value={formData.slug}
                                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                                required
                                                helperText='Boş bırakılırsa başlıktan otomatik oluşturulur'
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment
                                                            position='start'
                                                            sx={{
                                                                backgroundColor: '#f0f0f0',
                                                                borderRadius: '4px',
                                                                paddingX: 1,
                                                                marginRight: 1,
                                                                color: 'text.secondary',
                                                                fontSize: '0.9rem'
                                                            }}
                                                        >
                                                            https://alastik.com/sayfa/
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: (
                                                        <InputAdornment position='end'>
                                                            <Tooltip title='Başlıktan otomatik URL oluştur'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={handleAutoGenerateSeoUrl}
                                                                    edge='end'
                                                                >
                                                                    <i className='ri-sparkling-line' />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Anahtar Kelimeler'
                                                placeholder='kelime1, kelime2, kelime3'
                                                value={formData.seo.metaKeywords}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    seo: { ...prev.seo, metaKeywords: e.target.value }
                                                }))}
                                                helperText='Virgülle ayırarak yazın'
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default PageForm