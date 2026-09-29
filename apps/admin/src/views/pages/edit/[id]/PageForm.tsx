'use client'

import SeoLivePanel from '@/views/seo-module/SeoLivePanel'

import { useState, useEffect } from 'react'
import { getSiteUrl } from '@/utils/activeSite'
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
import Popover from '@mui/material/Popover'

/* Editor */
import classnames from 'classnames'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Link } from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image } from '@tiptap/extension-image'

/* Toast */
import { toast } from 'react-toastify'

/* API */
import { createPage, updatePage, type PageType } from '@/utils/api/pages'

/* Components */
import CustomIconButton from '@/@core/components/mui/IconButton'

/* Styles */
import '@/libs/styles/tiptapEditor.css'

interface PageFormProps {
    page?: PageType
    isEdit?: boolean
}

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    const [colorAnchor, setColorAnchor] = useState<HTMLButtonElement | null>(null)
    const [highlightAnchor, setHighlightAnchor] = useState<HTMLButtonElement | null>(null)

    if (!editor) return null

    const colors = [
        '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
        '#FFA500', '#800080', '#008000', '#000080', '#808080', '#C0C0C0'
    ]

    const setLink = () => {
        const url = window.prompt('Link URL\'si girin:')
        if (url) {
            editor.chain().focus().setLink({ href: url }).run()
        }
    }

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }

    return (
        <div className='flex flex-wrap gap-x-3 gap-y-1 pbs-5 pbe-4 pli-5'>
            {/* Başlıklar */}
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

            {/* Metin stilleri */}
            <CustomIconButton
                {...(editor.isActive('bold') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <i className={classnames('ri-bold', { 'text-textSecondary': !editor.isActive('bold') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('underline') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <i className={classnames('ri-underline', { 'text-textSecondary': !editor.isActive('underline') })} />
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
                {...(editor.isActive('strike') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                <i className={classnames('ri-strikethrough', { 'text-textSecondary': !editor.isActive('strike') })} />
            </CustomIconButton>

            {/* Renk */}
            <CustomIconButton
                variant='outlined'
                size='small'
                onClick={(e) => setColorAnchor(e.currentTarget)}
            >
                <i className='ri-font-color' />
            </CustomIconButton>
            <CustomIconButton
                variant='outlined'
                size='small'
                onClick={() => {
                    const url = window.prompt('Resim URL\'si girin:')
                    if (url) {
                        editor.chain().focus().setImage({ src: url }).run()
                    }
                }}
            >
                <i className='ri-image-add-line' />
            </CustomIconButton>
            <Popover
                open={Boolean(colorAnchor)}
                anchorEl={colorAnchor}
                onClose={() => setColorAnchor(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                    {colors.map(color => (
                        <button
                            key={color}
                            onClick={() => {
                                editor.chain().focus().setColor(color).run()
                                setColorAnchor(null)
                            }}
                            style={{
                                width: '30px',
                                height: '30px',
                                backgroundColor: color,
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
            </Popover>

            {/* Highlight */}
            <CustomIconButton
                variant='outlined'
                size='small'
                onClick={(e) => setHighlightAnchor(e.currentTarget)}
            >
                <i className='ri-mark-pen-line' />
            </CustomIconButton>

            <Popover
                open={Boolean(highlightAnchor)}
                anchorEl={highlightAnchor}
                onClose={() => setHighlightAnchor(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                    {colors.map(color => (
                        <button
                            key={color}
                            onClick={() => {
                                editor.chain().focus().toggleHighlight({ color }).run()
                                setHighlightAnchor(null)
                            }}
                            style={{
                                width: '30px',
                                height: '30px',
                                backgroundColor: color,
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
            </Popover>

            {/* Listeler */}
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

            {/* Hizalama */}
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

            <CustomIconButton
                {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
                <i className={classnames('ri-align-right', { 'text-textSecondary': !editor.isActive({ textAlign: 'right' }) })} />
            </CustomIconButton>

            {/* Link */}
            <CustomIconButton
                {...(editor.isActive('link') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={setLink}
            >
                <i className={classnames('ri-link', { 'text-textSecondary': !editor.isActive('link') })} />
            </CustomIconButton>

            <CustomIconButton
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={!editor.isActive('link')}
            >
                <i className='ri-link-unlink' />
            </CustomIconButton>

            {/* Blockquote */}
            <CustomIconButton
                {...(editor.isActive('blockquote') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <i className={classnames('ri-double-quotes-l', { 'text-textSecondary': !editor.isActive('blockquote') })} />
            </CustomIconButton>

            {/* Horizontal Rule */}
            <CustomIconButton
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
                <i className='ri-separator' />
            </CustomIconButton>

            {/* Table */}
            <CustomIconButton
                variant='outlined'
                size='small'
                onClick={insertTable}
            >
                <i className='ri-table-line' />
            </CustomIconButton>

            {editor.isActive('table') && (
                <>
                    <CustomIconButton
                        variant='outlined'
                        size='small'
                        onClick={() => editor.chain().focus().addColumnBefore().run()}
                    >
                        <i className='ri-insert-column-left' />
                    </CustomIconButton>

                    <CustomIconButton
                        variant='outlined'
                        size='small'
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                    >
                        <i className='ri-insert-column-right' />
                    </CustomIconButton>

                    <CustomIconButton
                        variant='outlined'
                        size='small'
                        onClick={() => editor.chain().focus().deleteColumn().run()}
                    >
                        <i className='ri-delete-column' />
                    </CustomIconButton>

                    <CustomIconButton
                        variant='outlined'
                        size='small'
                        onClick={() => editor.chain().focus().addRowBefore().run()}
                    >
                        <i className='ri-insert-row-top' />
                    </CustomIconButton>

                    <CustomIconButton
                        variant='outlined'
                        size='small'
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                    >
                        <i className='ri-insert-row-bottom' />
                    </CustomIconButton>

                    <CustomIconButton
                        variant='outlined'
                        size='small'
                        onClick={() => editor.chain().focus().deleteRow().run()}
                    >
                        <i className='ri-delete-row' />
                    </CustomIconButton>

                    <CustomIconButton
                        variant='outlined'
                        size='small'
                        onClick={() => editor.chain().focus().deleteTable().run()}
                    >
                        <i className='ri-delete-bin-line' />
                    </CustomIconButton>
                </>
            )}
        </div>
    )
}

const PageForm = ({ page, isEdit = false }: PageFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [isHtmlMode, setIsHtmlMode] = useState(() => {
        if (typeof window !== 'undefined' && isEdit && page?._id) {
            const savedMode = localStorage.getItem(`page-editor-mode-${page._id}`)
            if (savedMode) {
                return savedMode === 'html'
            }
        }
        return isEdit && page?.content ? true : false
    })

    const [htmlContent, setHtmlContent] = useState('')

    const [formData, setFormData] = useState({
        title: page?.title || '',
        slug: page?.slug || '',
        excerpt: page?.excerpt || '',
        status: page?.status || 'published',
        template: page?.template || 'default',
        seo: {
            metaTitle: page?.seo?.metaTitle || '',
            metaDescription: page?.seo?.metaDescription || '',
            metaKeywords: page?.seo?.metaKeywords?.join(', ') || '',
            focusKeyword: (page?.seo as { focusKeyword?: string } | undefined)?.focusKeyword || ''
        }
    })

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                paragraph: {
                    HTMLAttributes: {
                        class: null,
                    }
                },
                heading: {
                    HTMLAttributes: {
                        class: null,
                    }
                },
                hardBreak: false,
                horizontalRule: false,
            }),
            Placeholder.configure({
                placeholder: 'Sayfa içeriğini giriniz...'
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph']
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: null,
                },
            })
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-5',
            },
        },
        immediatelyRender: false,
        parseOptions: {
            preserveWhitespace: 'full'
        }
    })

    useEffect(() => {
        if (page?.content) {
            setHtmlContent(page.content)
        }
    }, [page?.content])

    useEffect(() => {
        if (editor && !isHtmlMode && htmlContent) {
            editor.commands.setContent(htmlContent)
        }
    }, [editor, isHtmlMode])

    const toggleHtmlMode = () => {
        if (!editor) return;

        if (isHtmlMode) {
            setIsHtmlMode(false);
            setTimeout(() => {
                editor.commands.setContent(htmlContent);
            }, 100);
        } else {
            // Editor'dan HTML'e geç
            const editorHTML = editor.getHTML()
            setHtmlContent(editorHTML);
            setIsHtmlMode(true);
        }
    }

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

        const content = isHtmlMode ? htmlContent : (editor?.getHTML() || '')

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
                    metaKeywords: formData.seo.metaKeywords.split(',').map(k => k.trim()).filter(Boolean),
                    focusKeyword: formData.seo.focusKeyword.trim()
                }
            }

            let savedPageId = page?._id

            if (isEdit && page) {
                await updatePage(page._id, pageData)
                savedPageId = page._id
                toast.success('Sayfa güncellendi')
            } else {
                const newPage = await createPage(pageData)
                savedPageId = newPage._id || newPage.data?._id
                toast.success('Sayfa oluşturuldu')
            }

            // MODE'U KAYDET (HTML veya Editor)
            if (savedPageId) {
                localStorage.setItem(`page-editor-mode-${savedPageId}`, isHtmlMode ? 'html' : 'editor')
            }

            router.push('/tr/apps/pages/list')
        } catch (error) {
            console.error('HATA:', error)
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
                                    <div className='flex items-center justify-between mb-4'>
                                        <Typography variant='h6'>
                                            Sayfa İçeriği
                                        </Typography>
                                        <Button
                                            variant='outlined'
                                            size='small'
                                            onClick={toggleHtmlMode}
                                            startIcon={<i className={isHtmlMode ? 'ri-edit-line' : 'ri-code-line'} />}
                                        >
                                            {isHtmlMode ? 'Editör Modu' : 'HTML Modu'}
                                        </Button>
                                    </div>

                                    {isHtmlMode ? (
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={20}
                                            value={htmlContent}
                                            onChange={(e) => setHtmlContent(e.target.value)}
                                            placeholder='HTML kodunu buraya yazın...'
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontFamily: 'monospace',
                                                    fontSize: '14px'
                                                }
                                            }}
                                        />
                                    ) : (
                                        <Card className='p-0 border shadow-none'>
                                            <CardContent className='p-0'>
                                                <EditorToolbar editor={editor} />
                                                <Divider className='mli-5' />
                                                <EditorContent editor={editor} />
                                            </CardContent>
                                        </Card>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Sağ Kolon - SEO vb. aynı kalacak */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Grid container spacing={6}>
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
                                                label='SEO URL'
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
                                                            {getSiteUrl()}/sayfa/
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

                                        {/* SEO analizi: odak kelime + canlı kriter kontrolü */}
                                        <Grid size={{ xs: 12 }}>
                                            <SeoLivePanel
                                                type='page'
                                                focusKeyword={formData.seo.focusKeyword}
                                                onFocusKeywordChange={value => setFormData(prev => ({ ...prev, seo: { ...prev.seo, focusKeyword: value } }))}
                                                title={formData.seo.metaTitle || formData.title}
                                                description={formData.seo.metaDescription || formData.excerpt}
                                                slug={formData.slug}
                                                content={() => (isHtmlMode ? htmlContent : (editor?.getHTML() || ''))}
                                                keywords={formData.seo.metaKeywords.split(',').map(k => k.trim()).filter(Boolean)}
                                                refId={page?._id}
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