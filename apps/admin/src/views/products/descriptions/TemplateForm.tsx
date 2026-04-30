'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'

/* MUI */
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
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

/* Components */
import CustomIconButton from '@/@core/components/mui/IconButton'

/* API */
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

/* Styles */
import '@/libs/styles/tiptapEditor.css'

type TemplateFormProps = {
    mode: 'new' | 'edit'
    templateId?: string
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
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <i className={classnames('ri-h-2', { 'text-textSecondary': !editor.isActive('heading', { level: 2 }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('heading', { level: 3 }) && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                <i className={classnames('ri-h-3', { 'text-textSecondary': !editor.isActive('heading', { level: 3 }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('bold') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <i className={classnames('ri-bold', { 'text-textSecondary': !editor.isActive('bold') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('underline') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <i className={classnames('ri-underline', { 'text-textSecondary': !editor.isActive('underline') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('italic') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <i className={classnames('ri-italic', { 'text-textSecondary': !editor.isActive('italic') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('strike') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                <i className={classnames('ri-strikethrough', { 'text-textSecondary': !editor.isActive('strike') })} />
            </CustomIconButton>

            <CustomIconButton
                variant='outlined' size='small'
                onClick={(e) => setColorAnchor(e.currentTarget)}
            >
                <i className='ri-font-color' />
            </CustomIconButton>

            <CustomIconButton
                variant='outlined' size='small'
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
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
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
                                width: '30px', height: '30px',
                                backgroundColor: color,
                                border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
            </Popover>

            <CustomIconButton
                variant='outlined' size='small'
                onClick={(e) => setHighlightAnchor(e.currentTarget)}
            >
                <i className='ri-mark-pen-line' />
            </CustomIconButton>

            <Popover
                open={Boolean(highlightAnchor)}
                anchorEl={highlightAnchor}
                onClose={() => setHighlightAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
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
                                width: '30px', height: '30px',
                                backgroundColor: color,
                                border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
            </Popover>

            <CustomIconButton
                {...(editor.isActive('bulletList') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <i className={classnames('ri-list-unordered', { 'text-textSecondary': !editor.isActive('bulletList') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('orderedList') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <i className={classnames('ri-list-ordered', { 'text-textSecondary': !editor.isActive('orderedList') })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive({ textAlign: 'left' }) && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
                <i className={classnames('ri-align-left', { 'text-textSecondary': !editor.isActive({ textAlign: 'left' }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive({ textAlign: 'center' }) && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
                <i className={classnames('ri-align-center', { 'text-textSecondary': !editor.isActive({ textAlign: 'center' }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
                <i className={classnames('ri-align-right', { 'text-textSecondary': !editor.isActive({ textAlign: 'right' }) })} />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('link') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={setLink}
            >
                <i className={classnames('ri-link', { 'text-textSecondary': !editor.isActive('link') })} />
            </CustomIconButton>

            <CustomIconButton
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={!editor.isActive('link')}
            >
                <i className='ri-link-unlink' />
            </CustomIconButton>

            <CustomIconButton
                {...(editor.isActive('blockquote') && { color: 'primary' })}
                variant='outlined' size='small'
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <i className={classnames('ri-double-quotes-l', { 'text-textSecondary': !editor.isActive('blockquote') })} />
            </CustomIconButton>

            <CustomIconButton variant='outlined' size='small' onClick={insertTable}>
                <i className='ri-table-line' />
            </CustomIconButton>

            {editor.isActive('table') && (
                <>
                    <CustomIconButton variant='outlined' size='small' onClick={() => editor.chain().focus().addColumnBefore().run()}>
                        <i className='ri-insert-column-left' />
                    </CustomIconButton>
                    <CustomIconButton variant='outlined' size='small' onClick={() => editor.chain().focus().addColumnAfter().run()}>
                        <i className='ri-insert-column-right' />
                    </CustomIconButton>
                    <CustomIconButton variant='outlined' size='small' onClick={() => editor.chain().focus().deleteColumn().run()}>
                        <i className='ri-delete-column' />
                    </CustomIconButton>
                    <CustomIconButton variant='outlined' size='small' onClick={() => editor.chain().focus().addRowBefore().run()}>
                        <i className='ri-insert-row-top' />
                    </CustomIconButton>
                    <CustomIconButton variant='outlined' size='small' onClick={() => editor.chain().focus().addRowAfter().run()}>
                        <i className='ri-insert-row-bottom' />
                    </CustomIconButton>
                    <CustomIconButton variant='outlined' size='small' onClick={() => editor.chain().focus().deleteRow().run()}>
                        <i className='ri-delete-row' />
                    </CustomIconButton>
                    <CustomIconButton variant='outlined' size='small' onClick={() => editor.chain().focus().deleteTable().run()}>
                        <i className='ri-delete-bin-line' />
                    </CustomIconButton>
                </>
            )}
        </div>
    )
}

const TemplateForm = ({ mode, templateId }: TemplateFormProps) => {
    const router = useRouter()
    const { lang: locale } = useParams()

    const [name, setName] = useState('')
    const [models, setModels] = useState<string[]>([])
    const [isActive, setIsActive] = useState(true)

    const [modelOptions, setModelOptions] = useState<string[]>([])
    const [loading, setLoading] = useState(mode === 'edit')
    const [saving, setSaving] = useState(false)
    const [applying, setApplying] = useState(false)
    const [overrideExisting, setOverrideExisting] = useState(false)

    const [isHtmlMode, setIsHtmlMode] = useState(false)
    const [htmlContent, setHtmlContent] = useState('')

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                paragraph: { HTMLAttributes: { class: null as any } },
                heading: { HTMLAttributes: { class: null as any } },
                hardBreak: false,
                horizontalRule: false
            }),
            Placeholder.configure({ placeholder: 'Şablon içeriğini giriniz...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
            }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: { class: null as any }
            })
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-5'
            }
        },
        immediatelyRender: false,
        parseOptions: { preserveWhitespace: 'full' }
    })

    // Model seçeneklerini çek
    useEffect(() => {
        const loadModels = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.filters.productOptions())
                if (res.success) {
                    setModelOptions(res.data.ozelkod5Values || [])
                }
            } catch (err) {
                console.error('Model listesi yüklenemedi:', err)
            }
        }
        loadModels()
    }, [])

    // Edit modunda mevcut şablonu çek
    useEffect(() => {
        if (mode === 'edit' && templateId) {
            const loadTemplate = async () => {
                try {
                    const res = await fetchAPI(API_ENDPOINTS.descriptionTemplates.detail(templateId))
                    if (res.success) {
                        setName(res.data.name || '')
                        setModels(res.data.models || [])
                        setIsActive(res.data.isActive !== false)
                        setHtmlContent(res.data.content || '')
                    }
                } catch {
                    toast.error('Şablon yüklenemedi')
                } finally {
                    setLoading(false)
                }
            }
            loadTemplate()
        }
    }, [mode, templateId])

    useEffect(() => {
        if (editor && !isHtmlMode && htmlContent) {
            editor.commands.setContent(htmlContent, false)
        }
    }, [editor, isHtmlMode, htmlContent])

    const toggleHtmlMode = () => {
        if (!editor) return
        if (isHtmlMode) {
            setIsHtmlMode(false)
            setTimeout(() => {
                editor.commands.setContent(htmlContent)
            }, 100)
        } else {
            // Editor'dan HTML'e geç
            const editorHTML = editor.getHTML()
            setHtmlContent(editorHTML)
            setIsHtmlMode(true)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('Şablon adı zorunludur')
            return
        }

        const content = isHtmlMode ? htmlContent : (editor?.getHTML() || '')
        if (!content || content === '<p></p>') {
            toast.error('İçerik boş bırakılamaz')
            return
        }

        setSaving(true)
        try {
            const url = mode === 'new'
                ? API_ENDPOINTS.descriptionTemplates.create()
                : API_ENDPOINTS.descriptionTemplates.update(templateId!)

            const res = await fetchAPI(url, {
                method: mode === 'new' ? 'POST' : 'PATCH',
                body: JSON.stringify({ name: name.trim(), content, models, isActive })
            })

            if (res.success) {
                toast.success(mode === 'new' ? 'Şablon oluşturuldu' : 'Şablon güncellendi')
                if (mode === 'new' && res.data?.id) {
                    router.replace(`/${locale}/apps/products/templates/edit/${res.data.id}`)
                }
            } else {
                toast.error(res.message || 'Kayıt başarısız')
            }
        } catch {
            toast.error('Kayıt sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleApply = async () => {
        if (mode !== 'edit' || !templateId) return
        if (models.length === 0) {
            toast.error('En az bir model seçilmelidir')
            return
        }

        if (!confirm(`${models.length} modeldeki ürünlere bu şablon uygulanacak. Devam edilsin mi?`)) {
            return
        }

        setApplying(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.descriptionTemplates.apply(templateId), {
                method: 'POST',
                body: JSON.stringify({ models, overrideExisting })
            })

            if (res.success) {
                toast.success(res.message || 'Şablon uygulandı')
            } else {
                toast.error(res.message || 'Uygulama başarısız')
            }
        } catch {
            toast.error('Uygulama sırasında hata oluştu')
        } finally {
            setApplying(false)
        }
    }


    return (
        <form onSubmit={handleSave}>
            <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-y-4'>
                        <Typography variant='h4'>
                            {mode === 'edit' ? 'Şablonu Düzenle' : 'Yeni Açıklama Şablonu'}
                        </Typography>
                        <div className='flex gap-4'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.push(`/${locale}/apps/products/templates`)}
                                disabled={saving}
                            >
                                İptal
                            </Button>
                            <Button type='submit' variant='contained' disabled={saving}>
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                        </div>
                    </div>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6}>
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <TextField
                                        fullWidth
                                        label='Şablon Adı'
                                        placeholder='Örn: Pirelli Scorpion Verde Açıklaması'
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <div className='flex items-center justify-between mb-4'>
                                        <Typography variant='h6'>Şablon İçeriği</Typography>
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
                                <CardHeader title='Ayarlar' />
                                <Divider />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <Autocomplete
                                                multiple
                                                size='small'
                                                options={modelOptions}
                                                value={models}
                                                onChange={(_, val) => setModels(val)}
                                                renderInput={(params) => (
                                                    <TextField {...params} label='Atanacak Modeller' placeholder='Model seçin...' />
                                                )}
                                            />
                                            <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                                                Bu şablon, seçili modeldeki tüm ürünlere uygulanabilir
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={isActive}
                                                        onChange={(e) => setIsActive(e.target.checked)}
                                                    />
                                                }
                                                label='Aktif'
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {mode === 'edit' && (
                            <Grid size={{ xs: 12 }}>
                                <Card>
                                    <CardHeader title='Ürünlere Uygula' />
                                    <Divider />
                                    <CardContent>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={overrideExisting}
                                                    onChange={(e) => setOverrideExisting(e.target.checked)}
                                                />
                                            }
                                            label='Dolu olanların üzerine yaz'
                                        />
                                        <Button
                                            fullWidth
                                            variant='outlined'
                                            color='warning'
                                            sx={{ mt: 3 }}
                                            onClick={handleApply}
                                            disabled={applying || models.length === 0}
                                            startIcon={applying ? <CircularProgress size={16} /> : <i className='ri-check-double-line' />}
                                        >
                                            {applying ? 'Uygulanıyor...' : 'Şablonu Uygula'}
                                        </Button>
                                        <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
                                            Seçili modeldeki ürünlerin açıklama alanına bu şablon yazılacak.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default TemplateForm