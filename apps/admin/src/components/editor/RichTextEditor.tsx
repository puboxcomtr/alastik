'use client'

import { useEffect, useState } from 'react'

import classnames from 'classnames'
import Popover from '@mui/material/Popover'
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

import CustomIconButton from '@/@core/components/mui/IconButton'

import '@/libs/styles/tiptapEditor.css'

const COLORS = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#008000', '#000080', '#808080', '#C0C0C0'
]

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    const [colorAnchor, setColorAnchor] = useState<HTMLButtonElement | null>(null)
    const [highlightAnchor, setHighlightAnchor] = useState<HTMLButtonElement | null>(null)

    if (!editor) return null

    const setLink = () => {
        const url = window.prompt('Link URL\'si girin:')
        if (url) editor.chain().focus().setLink({ href: url }).run()
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
            <CustomIconButton variant='outlined' size='small' onClick={(e) => setColorAnchor(e.currentTarget)}>
                <i className='ri-font-color' />
            </CustomIconButton>
            <CustomIconButton
                variant='outlined' size='small'
                onClick={() => {
                    const url = window.prompt('Resim URL\'si girin:')
                    if (url) editor.chain().focus().setImage({ src: url }).run()
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
                    {COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => { editor.chain().focus().setColor(color).run(); setColorAnchor(null) }}
                            style={{ width: '30px', height: '30px', backgroundColor: color, border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                        />
                    ))}
                </div>
            </Popover>

            <CustomIconButton variant='outlined' size='small' onClick={(e) => setHighlightAnchor(e.currentTarget)}>
                <i className='ri-mark-pen-line' />
            </CustomIconButton>

            <Popover
                open={Boolean(highlightAnchor)}
                anchorEl={highlightAnchor}
                onClose={() => setHighlightAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                    {COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => { editor.chain().focus().toggleHighlight({ color }).run(); setHighlightAnchor(null) }}
                            style={{ width: '30px', height: '30px', backgroundColor: color, border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
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
                variant='outlined' size='small' onClick={setLink}
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

type Props = {
    value: string
    onChange: (html: string) => void
    placeholder?: string
    minHeight?: number
}

const RichTextEditor = ({ value, onChange, placeholder = 'İçeriği giriniz...', minHeight = 250 }: Props) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                paragraph: { HTMLAttributes: { class: null } },
                heading: { HTMLAttributes: { class: null } },
                hardBreak: false,
                horizontalRule: false
            }),
            Placeholder.configure({ placeholder }),
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
            Image.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: null } })
        ],
        content: value || '',
        editorProps: {
            attributes: {
                class: `prose prose-sm sm:prose max-w-none focus:outline-none p-5 min-h-[${minHeight}px]`
            }
        },
        immediatelyRender: false,
        parseOptions: { preserveWhitespace: 'full' },
        onUpdate: ({ editor: ed }) => onChange(ed.getHTML())
    })

    useEffect(() => {
        if (!editor) return
        const current = editor.getHTML()
        if (value !== current && !editor.isFocused) {
            editor.commands.setContent(value || '', false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor])

    return (
        <div className='border rounded'>
            <EditorToolbar editor={editor} />
            <div className='border-t'>
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default RichTextEditor
