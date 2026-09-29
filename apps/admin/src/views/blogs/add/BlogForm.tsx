'use client'

import SeoLivePanel from '@/views/seo-module/SeoLivePanel'

import { useState, useEffect } from 'react'
import { getSiteUrl } from '@/utils/activeSite'
import { useRouter } from 'next/navigation'

/* MUI */
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
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

/* Media Library */
import MediaLibrary from '@/components/MediaLibrary/MediaLibrary'
import type { MediaFile } from '@/types/apps/mediaTypes'

/* Get Image URL */
import { getImageUrl } from '@/libs/api'

/* Toast */
import { toast } from 'react-toastify'

/* API */
import { createBlog, updateBlog, type BlogType } from '@/utils/api/blogs'
import { fetchBlogCategories, type BlogCategoryType } from '@/utils/api/blogCategories'

/* Components */
import CustomIconButton from '@/@core/components/mui/IconButton'

/* Styles */
import '@/libs/styles/tiptapEditor.css'

interface BlogFormProps {
    blog?: BlogType
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

            <CustomIconButton
                {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
                <i className={classnames('ri-align-right', { 'text-textSecondary': !editor.isActive({ textAlign: 'right' }) })} />
            </CustomIconButton>

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

            <CustomIconButton
                {...(editor.isActive('blockquote') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <i className={classnames('ri-double-quotes-l', { 'text-textSecondary': !editor.isActive('blockquote') })} />
            </CustomIconButton>

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

const BlogForm = ({ blog, isEdit = false }: BlogFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Görsel yönetimi
    const [featuredImage, setFeaturedImage] = useState<string>(blog?.featuredImage || '')
    const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)

    // Blog kategorileri (çoklu seçim) — bir yazı birden fazla kategoriye eklenebilir
    const [categoryOptions, setCategoryOptions] = useState<BlogCategoryType[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        (blog?.categories || []).map((c: any) => (typeof c === 'string' ? c : c?._id)).filter(Boolean)
    )

    useEffect(() => {
        fetchBlogCategories()
            .then(res => { if (res?.success) setCategoryOptions(res.data || []) })
            .catch(() => {})
    }, [])

    const [isHtmlMode, setIsHtmlMode] = useState(false)

    useEffect(() => {
        if (isEdit && blog?._id) {
            const savedMode = localStorage.getItem(`blog-editor-mode-${blog._id}`)
            if (savedMode) {
                setIsHtmlMode(savedMode === 'html')
            } else if (blog?.content) {
                setIsHtmlMode(true)
            }
        }
    }, [isEdit, blog?._id, blog?.content])

    const [htmlContent, setHtmlContent] = useState('')

    const [formData, setFormData] = useState({
        title: blog?.title || '',
        slug: blog?.slug || '',
        excerpt: blog?.excerpt || '',
        status: blog?.status || 'published',
        featuredImage: blog?.featuredImage || '',
        seo: {
            metaTitle: blog?.seo?.metaTitle || '',
            metaDescription: blog?.seo?.metaDescription || '',
            metaKeywords: blog?.seo?.metaKeywords?.join(', ') || '',
            focusKeyword: (blog?.seo as { focusKeyword?: string } | undefined)?.focusKeyword || ''
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
                placeholder: 'Blog içeriğini giriniz...'
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

    // Blog içeriğini yükle
    useEffect(() => {
        if (blog?.content) {
            setHtmlContent(blog.content)
        }
    }, [blog?.content])

    // Editor'a içeriği yükle (HTML mode değilse)
    useEffect(() => {
        if (editor && !isHtmlMode && htmlContent) {
            editor.commands.setContent(htmlContent)
        }
    }, [editor, isHtmlMode])

    const toggleHtmlMode = () => {
        if (!editor) return;

        if (isHtmlMode) {
            // HTML'den Editor'a geç
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
    // Görsel Ekle
    const handleMediaSelect = (selectedFiles: MediaFile[]) => {
        if (selectedFiles.length > 0) {
            setFeaturedImage(selectedFiles[0].url)
            toast.success('Görsel eklendi')
        }
    }

    // Görsel Kaldırma
    const handleRemoveImage = () => {
        setFeaturedImage('')
        toast.success('Görsel kaldırıldı')
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
            const blogData = {
                title: formData.title,
                slug: formData.slug,
                content,
                excerpt: formData.excerpt,
                status: formData.status,
                featuredImage: featuredImage,
                categories: selectedCategories,
                seo: {
                    metaTitle: formData.seo.metaTitle,
                    metaDescription: formData.seo.metaDescription,
                    metaKeywords: formData.seo.metaKeywords.split(',').map(k => k.trim()).filter(Boolean),
                    focusKeyword: formData.seo.focusKeyword.trim()
                }
            }

            let savedBlogId = blog?._id

            if (isEdit && blog) {
                await updateBlog(blog._id, blogData)
                savedBlogId = blog._id
                toast.success('Blog güncellendi')
            } else {
                const newBlog = await createBlog(blogData)
                savedBlogId = newBlog._id || newBlog.data?._id
                toast.success('Blog oluşturuldu')
                if (savedBlogId) {
                    router.replace(`/tr/apps/blogs/edit/${savedBlogId}`)
                }
            }

            if (savedBlogId) {
                localStorage.setItem(`blog-editor-mode-${savedBlogId}`, isHtmlMode ? 'html' : 'editor')
            }
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message)
            } else {
                toast.error('Bir hata oluştu')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-y-4'>
                        <Typography variant='h4'>
                            {isEdit ? 'Blog Düzenle' : 'Yeni Blog Ekle'}
                        </Typography>
                        <div className='flex gap-4'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.push('/tr/apps/blogs/list')}
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

                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Blog Başlığı'
                                                placeholder='Örn: Lastik Bakım İpuçları'
                                                value={formData.title}
                                                onChange={handleTitleChange}
                                                required
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Kısa Açıklama'
                                                placeholder='Blog özeti'
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

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <div className='flex items-center justify-between mb-4'>
                                        <Typography variant='h6'>
                                            Blog İçeriği
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
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Blog Kategorileri (çoklu seçim — bir yazı birden fazla kategoride) */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Blog Kategorileri
                                    </Typography>
                                    <Autocomplete
                                        multiple
                                        options={categoryOptions}
                                        getOptionLabel={(o) => o.name}
                                        value={categoryOptions.filter(o => selectedCategories.includes(o._id))}
                                        onChange={(_e, val) => setSelectedCategories(val.map(v => v._id))}
                                        isOptionEqualToValue={(o, v) => o._id === v._id}
                                        renderInput={(params) => (
                                            <TextField {...params} placeholder='Kategori seçiniz' />
                                        )}
                                        noOptionsText='Kategori bulunamadı'
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Öne Çıkarılmış Görsel */}
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4'>
                                        Öne Çıkarılmış Görsel
                                    </Typography>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            {featuredImage ? (
                                                <Box>
                                                    <Box
                                                        sx={{
                                                            position: 'relative',
                                                            width: '100%',
                                                            paddingTop: '56.25%',
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            border: '1px solid',
                                                            borderColor: 'grey.300'
                                                        }}
                                                    >
                                                        <img
                                                            src={getImageUrl(featuredImage)}
                                                            alt='Öne çıkarılmış görsel'
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement
                                                                target.src = '/images/placeholder-image.png'
                                                            }}
                                                        />
                                                        <IconButton
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 8,
                                                                right: 8,
                                                                backgroundColor: 'error.main',
                                                                color: 'white',
                                                                '&:hover': {
                                                                    backgroundColor: 'error.dark'
                                                                }
                                                            }}
                                                            onClick={handleRemoveImage}
                                                        >
                                                            <i className='ri-delete-bin-line' />
                                                        </IconButton>
                                                    </Box>
                                                    <Button
                                                        variant='outlined'
                                                        fullWidth
                                                        sx={{ mt: 2 }}
                                                        onClick={() => setMediaLibraryOpen(true)}
                                                        startIcon={<i className='ri-refresh-line' />}
                                                    >
                                                        Görseli Değiştir
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Box>
                                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                                        <i className='ri-image-line' style={{ fontSize: 64, color: '#ccc' }} />
                                                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                                                            Henüz görsel eklenmemiş
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Aşağıdaki butona tıklayarak görsel ekleyebilirsiniz
                                                        </Typography>
                                                    </Box>
                                                    <Button
                                                        variant='contained'
                                                        fullWidth
                                                        onClick={() => setMediaLibraryOpen(true)}
                                                        startIcon={<i className='ri-image-add-line' />}
                                                    >
                                                        Görsel Ekle
                                                    </Button>
                                                </Box>
                                            )}
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
                                                label='SEO Başlığı'
                                                placeholder='Blog için SEO başlığı'
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
                                                placeholder='Blog için SEO açıklaması'
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
                                                placeholder='lastik-bakim-ipuclari'
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
                                                            {getSiteUrl()}/blog/
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

                                        {/* SEO analizi: odak kelime + canlı kriter kontrolü */}
                                        <Grid size={{ xs: 12 }}>
                                            <SeoLivePanel
                                                type='blog'
                                                focusKeyword={formData.seo.focusKeyword}
                                                onFocusKeywordChange={value => setFormData(prev => ({ ...prev, seo: { ...prev.seo, focusKeyword: value } }))}
                                                title={formData.seo.metaTitle || formData.title}
                                                description={formData.seo.metaDescription || formData.excerpt}
                                                slug={formData.slug}
                                                content={() => (isHtmlMode ? htmlContent : (editor?.getHTML() || ''))}
                                                keywords={formData.seo.metaKeywords.split(',').map(k => k.trim()).filter(Boolean)}
                                                refId={blog?._id}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            {/* Media Library Modal */}
            <MediaLibrary
                open={mediaLibraryOpen}
                onClose={() => setMediaLibraryOpen(false)}
                onSelect={handleMediaSelect}
                multiple={false}
                folder="blog"
                title="Blog Görseli Seç"
                maxFileSize={10 * 1024 * 1024}
            />
        </form>
    )
}

export default BlogForm