'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import Popover from '@mui/material/Popover'

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

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { getActiveSite, getSiteLabel } from '@/utils/activeSite'

import CustomIconButton from '@/@core/components/mui/IconButton'

import '@/libs/styles/tiptapEditor.css'

type SliderOption = { _id: string; name: string; key?: string }

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    const [colorAnchor, setColorAnchor] = useState<HTMLButtonElement | null>(null)

    if (!editor) return null

    const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000', '#000080', '#808080', '#C0C0C0']

    const setLink = () => {
        const url = window.prompt('Link URL girin:')
        if (url) editor.chain().focus().setLink({ href: url }).run()
    }

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }

    return (
        <div className='flex flex-wrap gap-x-3 gap-y-1 pbs-5 pbe-4 pli-5'>
            <CustomIconButton {...(editor.isActive('heading', { level: 2 }) && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <i className={classnames('ri-h-2', { 'text-textSecondary': !editor.isActive('heading', { level: 2 }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('heading', { level: 3 }) && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <i className={classnames('ri-h-3', { 'text-textSecondary': !editor.isActive('heading', { level: 3 }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('bold') && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleBold().run()}>
                <i className={classnames('ri-bold', { 'text-textSecondary': !editor.isActive('bold') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('underline') && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <i className={classnames('ri-underline', { 'text-textSecondary': !editor.isActive('underline') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('italic') && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleItalic().run()}>
                <i className={classnames('ri-italic', { 'text-textSecondary': !editor.isActive('italic') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('strike') && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleStrike().run()}>
                <i className={classnames('ri-strikethrough', { 'text-textSecondary': !editor.isActive('strike') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive({ textAlign: 'left' }) && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                <i className={classnames('ri-align-left', { 'text-textSecondary': !editor.isActive({ textAlign: 'left' }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive({ textAlign: 'center' }) && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                <i className={classnames('ri-align-center', { 'text-textSecondary': !editor.isActive({ textAlign: 'center' }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                <i className={classnames('ri-align-right', { 'text-textSecondary': !editor.isActive({ textAlign: 'right' }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('bulletList') && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <i className={classnames('ri-list-unordered', { 'text-textSecondary': !editor.isActive('bulletList') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('orderedList') && { color: 'primary' })} variant='outlined' size='small' onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <i className={classnames('ri-list-ordered', { 'text-textSecondary': !editor.isActive('orderedList') })} />
            </CustomIconButton>
            <CustomIconButton variant='outlined' size='small' onClick={setLink}>
                <i className='ri-link' />
            </CustomIconButton>
            <CustomIconButton variant='outlined' size='small' onClick={insertTable}>
                <i className='ri-table-line' />
            </CustomIconButton>
            <CustomIconButton variant='outlined' size='small' onClick={(e) => setColorAnchor(e.currentTarget)}>
                <i className='ri-font-color' />
            </CustomIconButton>
            <CustomIconButton variant='outlined' size='small' onClick={() => { const url = window.prompt('Resim URL girin:'); if (url) editor.chain().focus().setImage({ src: url }).run() }}>
                <i className='ri-image-add-line' />
            </CustomIconButton>
            <Popover open={Boolean(colorAnchor)} anchorEl={colorAnchor} onClose={() => setColorAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                    {colors.map(color => (
                        <button key={color} onClick={() => { editor.chain().focus().setColor(color).run(); setColorAnchor(null) }} style={{ width: '30px', height: '30px', backgroundColor: color, border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }} />
                    ))}
                </div>
            </Popover>
        </div>
    )
}

const CategoryEditForm = () => {
    const router = useRouter()
    const params = useParams()
    const lang = params.lang as string
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editorReady, setEditorReady] = useState(false)
    const [sliders, setSliders] = useState<SliderOption[]>([])
    const [categoryName, setCategoryName] = useState('')
    const [pendingContent, setPendingContent] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoUrl: '',
        webOrder: 0,
        sliderId: ''
    })

    const activeSite = getActiveSite()
    const siteLabel = getSiteLabel(activeSite)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                paragraph: { HTMLAttributes: { class: null } },
                heading: { HTMLAttributes: { class: null } },
                hardBreak: false,
                horizontalRule: false
            }),
            Placeholder.configure({ placeholder: 'Kategori içeriğini giriniz...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline,
            Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Image.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: null } })
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-5'
            }
        },
        immediatelyRender: false,
        parseOptions: { preserveWhitespace: 'full' },
        onCreate: () => setEditorReady(true)
    })

    useEffect(() => {
        const loadSliders = async () => {
            try {
                const result = await fetchAPI(`${API_ENDPOINTS.categories.list()}/sliders/list`)
                if (result.success && result.data) setSliders(result.data)
            } catch { }
        }
        loadSliders()
    }, [])

    useEffect(() => {
        const loadCategory = async () => {
            if (!id) return
            try {
                setLoading(true)
                const result = await fetchAPI(API_ENDPOINTS.categories.detail(id))
                if (result.success && result.data) {
                    const d = result.data
                    setCategoryName(d.name || '')
                    setFormData({
                        description: d.description || '',
                        seoTitle: d.seoTitle || '',
                        seoDescription: d.seoDescription || '',
                        seoUrl: d.seoUrl || '',
                        webOrder: d.webOrder || 0,
                        sliderId: d.sliderId || ''
                    })
                    setPendingContent(d.content || '')
                }
            } catch (err) {
                toast.error('Kategori yuklenemedi')
            } finally {
                setLoading(false)
            }
        }
        loadCategory()
    }, [id])

    useEffect(() => {
        if (editor && editorReady && pendingContent !== null) {
            editor.commands.setContent(pendingContent)
            setPendingContent(null)
        }
    }, [editor, editorReady, pendingContent])

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const content = editor?.getHTML() || ''
            const body = {
                seoTitle: formData.seoTitle,
                seoDescription: formData.seoDescription,
                content,
                seoUrl: formData.seoUrl,
                webOrder: formData.webOrder,
                sliderId: formData.sliderId || null
            }
            const result = await fetchAPI(API_ENDPOINTS.categories.detail(id), {
                method: 'PATCH',
                body: JSON.stringify(body)
            })
            if (result.success) {
                toast.success('Kategori güncellendi')
            } else {
                toast.error(result.message || 'Güncelleme başarısız')
            }
        } catch (err) {
            toast.error('Kategori güncellenirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography>Yükleniyor...</Typography>
                </CardContent>
            </Card>
        )
    }

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 6 }} className='flex items-end'>
                <div className='flex items-center gap-3'>
                    <Typography variant='h5'>{categoryName || 'Kategori'} Kategorisini Düzenle</Typography>
                </div>
            </Grid>
            <Grid size={{ xs: 6 }}>
                <div className='flex items-center justify-end gap-3'>
                    <Button variant='outlined' color='secondary' startIcon={<i className='ri-arrow-left-line' />} onClick={() => router.push(`/${lang}/apps/category/list`)}>
                        Geri Dön
                    </Button>
                    <Button variant='contained' onClick={handleSave} disabled={saving}>
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </div>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
                <Card>
                    <Divider />
                    <EditorToolbar editor={editor} />
                    <Divider />
                    <CardContent className='p-0'>
                        <EditorContent editor={editor} />
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                    <CardHeader title='Ayarlar' />
                    <Divider />
                    <CardContent>
                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12 }}>
                                <TextField fullWidth label={`SEO Başlık`} value={formData.seoTitle} onChange={(e) => handleChange('seoTitle', e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField fullWidth label={`SEO Açıklama`} multiline rows={3} value={formData.seoDescription} onChange={(e) => handleChange('seoDescription', e.target.value)} helperText={`${formData.seoDescription.length}/160 karakter`} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField fullWidth label='SEO URL' value={formData.seoUrl} onChange={(e) => handleChange('seoUrl', e.target.value)} InputProps={{ startAdornment: <InputAdornment position='start'>/kategori/</InputAdornment> }} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField fullWidth type='number' label='Öncelik' value={formData.webOrder} onChange={(e) => handleChange('webOrder', Number(e.target.value) || 0)} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Kategori Slider</InputLabel>
                                    <Select label='Kategori Slider' value={formData.sliderId} onChange={(e) => handleChange('sliderId', e.target.value)}>
                                        <MenuItem value=''>Yok</MenuItem>
                                        {sliders.map(s => (
                                            <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default CategoryEditForm
