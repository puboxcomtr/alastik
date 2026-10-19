'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import MenuItem from '@mui/material/MenuItem'

import { useEditor, EditorContent } from '@tiptap/react'
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

import MailEditorToolbar from '../components/MailEditorToolbar'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import '@/libs/styles/tiptapEditor.css'

type RecipientType = 'mail_group' | 'user' | 'single_email'

type OptionItem = { id: string; label: string }

const MailTemplateAddForm = () => {
    const router = useRouter()
    const { lang: locale } = useParams()

    const [title, setTitle] = useState('')
    const [subject, setSubject] = useState('')
    const [recipientType, setRecipientType] = useState<RecipientType>('mail_group')
    const [recipientValues, setRecipientValues] = useState<string[]>([])
    const [singleEmailInput, setSingleEmailInput] = useState<string>('')
    const [isActive, setIsActive] = useState(true)
    const [saving, setSaving] = useState(false)

    const [isHtmlMode, setIsHtmlMode] = useState(false)
    const [htmlContent, setHtmlContent] = useState('')

    const [mailGroups, setMailGroups] = useState<OptionItem[]>([])
    const [users, setUsers] = useState<OptionItem[]>([])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                paragraph: { HTMLAttributes: { class: null as any } },
                heading: { HTMLAttributes: { class: null as any } },
                hardBreak: false,
                horizontalRule: false
            }),
            Placeholder.configure({ placeholder: 'Mail içeriğini giriniz...' }),
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

    useEffect(() => {
        const loadOptions = async () => {
            try {
                if (recipientType === 'mail_group' && mailGroups.length === 0) {
                    const res = await fetchAPI(API_ENDPOINTS.mailManagement.groups())

                    if (res.success) {
                        setMailGroups((res.data || []).map((g: any) => ({ id: g.id, label: g.name })))
                    }
                }

                if (recipientType === 'user' && users.length === 0) {
                    const res = await fetchAPI(API_ENDPOINTS.mailManagement.users())

                    if (res.success) {
                        setUsers((res.data || []).map((u: any) => ({ id: u.id, label: `${u.name} (${u.email})` })))
                    }
                }
            } catch (err) {
                console.error('Seçenekler yüklenemedi:', err)
            }
        }

        loadOptions()
    }, [recipientType])

    const toggleHtmlMode = () => {
        if (!editor) return

        if (isHtmlMode) {
            setIsHtmlMode(false)
            setTimeout(() => {
                editor.commands.setContent(htmlContent)
            }, 100)
        } else {
            setHtmlContent(editor.getHTML())
            setIsHtmlMode(true)
        }
    }

    const handleRecipientTypeChange = (type: RecipientType) => {
        setRecipientType(type)
        setRecipientValues([])
        setSingleEmailInput('')
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim()) {
            toast.error('Mail başlığı zorunludur')

            return
        }

        if (!subject.trim()) {
            toast.error('Konu zorunludur')

            return
        }

        let finalRecipients: string[] = []

        if (recipientType === 'single_email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

            if (!singleEmailInput.trim()) {
                toast.error('Email adresi zorunludur')

                return
            }

            if (!emailRegex.test(singleEmailInput.trim())) {
                toast.error('Geçerli bir email adresi giriniz')

                return
            }

            finalRecipients = [singleEmailInput.trim()]
        } else {
            if (recipientValues.length === 0) {
                toast.error('En az bir alıcı seçilmelidir')

                return
            }

            finalRecipients = recipientValues
        }

        const content = isHtmlMode ? htmlContent : (editor?.getHTML() || '')

        if (!content || content === '<p></p>') {
            toast.error('İçerik boş bırakılamaz')

            return
        }

        setSaving(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.mailManagement.create(), {
                method: 'POST',
                body: JSON.stringify({
                    title: title.trim(),
                    subject: subject.trim(),
                    body: content,
                    recipientType,
                    recipientValue: finalRecipients,
                    isActive
                })
            })

            if (res.success) {
                toast.success('Mail şablonu oluşturuldu')
                router.push(`/${locale}/apps/mail/management`)
            } else {
                toast.error(res.message || 'Kayıt başarısız')
            }
        } catch {
            toast.error('Kayıt sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const renderRecipientField = () => {
        if (recipientType === 'single_email') {
            return (
                <TextField
                    fullWidth
                    size='small'
                    type='email'
                    label='Email Adresi'
                    placeholder='ornek@alastik.com'
                    value={singleEmailInput}
                    onChange={(e) => setSingleEmailInput(e.target.value)}
                />
            )
        }

        const options = recipientType === 'mail_group' ? mailGroups : users
        const selectedOptions = options.filter(o => recipientValues.includes(o.id))

        return (
            <Autocomplete
                multiple
                size='small'
                options={options}
                value={selectedOptions}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                onChange={(_, vals) => setRecipientValues(vals.map(v => v.id))}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={recipientType === 'mail_group' ? 'Mail Grupları' : 'Üyeler'}
                        placeholder='Seçiniz...'
                    />
                )}
            />
        )
    }

    return (
        <form onSubmit={handleSave}>
            <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-y-4'>
                        <Typography variant='h4'>Yeni Mail Şablonu</Typography>
                        <div className='flex gap-4'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                onClick={() => router.push(`/${locale}/apps/mail/management`)}
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
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Mail Başlığı'
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                required
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                fullWidth
                                                label='Konu'
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                required
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
                                        <Typography variant='h6'>İçerik</Typography>
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
                                                <MailEditorToolbar editor={editor} />
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
                                <CardHeader title='Alıcı' />
                                <Divider />
                                <CardContent>
                                    <Grid container spacing={5}>
                                        <Grid size={{ xs: 12 }}>
                                            <TextField
                                                select
                                                fullWidth
                                                size='small'
                                                label='Alıcı Tipi'
                                                value={recipientType}
                                                onChange={(e) => handleRecipientTypeChange(e.target.value as RecipientType)}
                                            >
                                                <MenuItem value='mail_group'>Mail Grubu</MenuItem>
                                                <MenuItem value='user'>Üye</MenuItem>
                                                <MenuItem value='single_email'>Tek Email Adresi</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            {renderRecipientField()}
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader title='Ayarlar' />
                                <Divider />
                                <CardContent>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                            />
                                        }
                                        label='Aktif'
                                    />
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default MailTemplateAddForm