'use client'

import { Card, CardHeader, CardContent, Divider, Typography, TextField } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useSettings } from '@/contexts/SettingsContext'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import type { Editor } from '@tiptap/core'
import classnames from 'classnames'
import CustomIconButton from '@core/components/mui/IconButton'
import '@/libs/styles/tiptapEditor.css'
import { useEffect } from 'react'

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
                {...(editor.isActive('underline') && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <i className={classnames('ri-underline', { 'text-textSecondary': !editor.isActive('underline') })} />
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
            <CustomIconButton
                {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })}
                variant='outlined'
                size='small'
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
                <i className={classnames('ri-align-right', { 'text-textSecondary': !editor.isActive({ textAlign: 'right' }) })} />
            </CustomIconButton>
        </div>
    )
}

function ContractEditor({
    title,
    field,
    initialValue
}: {
    title: string
    field: string
    initialValue: string
}) {
    const { updateField } = useSettings()

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: `${title} metnini giriniz...` }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline
        ],
        immediatelyRender: false,
        content: initialValue || '',
        onUpdate: ({ editor }) => {
            updateField('legalContracts', field, editor.getHTML())
        }
    })

    useEffect(() => {
        if (editor && initialValue) {
            editor.commands.setContent(initialValue, false)
        }
    }, [initialValue, editor])

    return (
        <Grid size={{ xs: 12 }}>
            <Typography className='mb-1'>{title}</Typography>
            <Card className='p-0 border shadow-none'>
                <CardContent className='p-0'>
                    <EditorToolbar editor={editor} />
                    <Divider className='mli-5' />
                    <EditorContent
                        editor={editor}
                        className='overflow-y-auto flex'
                        style={{ minHeight: '300px', maxHeight: '300px' }}
                    />
                </CardContent>
            </Card>
        </Grid>
    )
}

export default function LegalContractsSettings() {
    const { settings, updateField } = useSettings()

    const legalContracts = settings?.legalContracts || {}

    return (
        <Card>
            <CardHeader title='Yasal Sözleşmeler' />
            <CardContent>
                <Grid container spacing={5}>
                    {/* İletişim - Normal TextField */}
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label='İletişim'
                            placeholder='İletişim bilgilerini giriniz...'
                            defaultValue={legalContracts.contact || ''}
                            onChange={(e) => {
                                updateField('legalContracts', 'contact', e.target.value)
                            }}
                        />
                    </Grid>

                    {/* Editörler */}
                    <ContractEditor
                        title='Ön Bilgilendirme Formu'
                        field='preInformation'
                        initialValue={legalContracts.preInformation || ''}
                    />

                    <ContractEditor
                        title='Üyelik Sözleşmesi'
                        field='membershipAgreement'
                        initialValue={legalContracts.membershipAgreement || ''}
                    />

                    <ContractEditor
                        title='KVKK Metni'
                        field='kvkk'
                        initialValue={legalContracts.kvkk || ''}
                    />

                    <ContractEditor
                        title='Satış Sözleşmesi'
                        field='salesAgreement'
                        initialValue={legalContracts.salesAgreement || ''}
                    />

                    <ContractEditor
                        title='İade ve İptal Prosedürü'
                        field='returnPolicy'
                        initialValue={legalContracts.returnPolicy || ''}
                    />

                    <ContractEditor
                        title='Satış Koşulları'
                        field='salesConditions'
                        initialValue={legalContracts.salesConditions || ''}
                    />
                </Grid>
            </CardContent>
        </Card>
    )
}