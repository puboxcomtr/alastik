'use client'
// React Import
import React, { useEffect } from 'react'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

// MUI Imports
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

/* Editor Imports */
import classnames from 'classnames'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'

// Context
import { useProductUpdate } from '@/contexts/ProductUpdateContext'

// Components Imports
import CustomIconButton from '@core/components/mui/IconButton'

// Style Imports
import '@/libs/styles/tiptapEditor.css'

export interface ProductInformationProps {
  product: ProductType
}

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null
  }

  return (
    <div className='flex flex-wrap gap-x-3 gap-y-1 pbs-5 pbe-4 pli-5'>
      {/* Başlık H2 */}
      <CustomIconButton
        {...(editor.isActive('heading', { level: 2 }) && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <i className={classnames('ri-h-2', { 'text-textSecondary': !editor.isActive('heading', { level: 2 }) })} />
      </CustomIconButton>

      {/* Başlık H3 */}
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

      {/* Bullet List */}
      <CustomIconButton
        {...(editor.isActive('bulletList') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <i className={classnames('ri-list-unordered', { 'text-textSecondary': !editor.isActive('bulletList') })} />
      </CustomIconButton>

      {/* Numbered List */}
      <CustomIconButton
        {...(editor.isActive('orderedList') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <i className={classnames('ri-list-ordered', { 'text-textSecondary': !editor.isActive('orderedList') })} />
      </CustomIconButton>

      {/* Code */}
      <CustomIconButton
        {...(editor.isActive('code') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <i className={classnames('ri-code-line', { 'text-textSecondary': !editor.isActive('code') })} />
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
        <i
          className={classnames('ri-align-center', {
            'text-textSecondary': !editor.isActive({ textAlign: 'center' })
          })}
        />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <i
          className={classnames('ri-align-right', {
            'text-textSecondary': !editor.isActive({ textAlign: 'right' })
          })}
        />
      </CustomIconButton>
      <CustomIconButton
        {...(editor.isActive({ textAlign: 'justify' }) && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <i
          className={classnames('ri-align-justify', {
            'text-textSecondary': !editor.isActive({ textAlign: 'justify' })
          })}
        />
      </CustomIconButton>
      <CustomIconButton
        {...(editor.isActive('link') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => {
          const url = window.prompt('Link URL\'si girin:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
      >
        <i className={classnames('ri-link', { 'text-textSecondary': !editor.isActive('link') })} />
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
        <i className='ri-image-line' />
      </CustomIconButton>

      <CustomIconButton
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <i className='ri-separator' />
      </CustomIconButton>

      <CustomIconButton
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <i className='ri-link-unlink' />
      </CustomIconButton>
    </div>
  )
}

const ProductInformation = ({ product }: ProductInformationProps) => {
  // Context hook
  const { updateField } = useProductUpdate()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Ürün açıklaması giriniz...'
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Underline
    ],
    immediatelyRender: false,
    content: product?.description || product?.customDescription || '',
    onUpdate: ({ editor }) => {
      // Her değişiklikte context'e gönder
      const htmlContent = editor.getHTML()
      updateField('customDescription', htmlContent)
    }
  })

  // Product değiştiğinde editor içeriğini güncelle
  useEffect(() => {
    if (editor && product) {
      const currentContent = product.description || product.customDescription || ''
      // HTML string'i temizle ve doğru formata çevir
      if (currentContent && currentContent !== '<p></p>' && currentContent !== '') {
        // Eğer content zaten HTML ise, editor'a HTML olarak set et
        editor.commands.setContent(currentContent, false)
      }
    }
  }, [product, editor])

  return (
    <Card>
      <CardHeader title='Ürün Bilgileri' />
      <CardContent>
        <Grid container spacing={5}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label='Ürün Adı'
              placeholder={product.name}
              defaultValue={product.name}
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} className='pbe-5'>
            <TextField
              fullWidth
              label='Stok Kodu'
              placeholder='Stok Kodu'
              defaultValue={product.sku}
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} className='mbe-5'>
            <TextField
              fullWidth
              label='Stok Miktarı'
              placeholder='Stok Miktarı'
              defaultValue={product.qty}
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
          {product.barcode && (
            <Grid size={{ xs: 12, sm: 4 }} className='mbe-5'>
              <TextField
                fullWidth
                label='Barkod'
                placeholder='Barkod'
                defaultValue={product.barcode}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
          )}
        </Grid>
        <Typography className='mb-1'>Ürün Açıklaması</Typography>
        <Card className='p-0 border shadow-none'>
          <CardContent className='p-0'>
            <EditorToolbar editor={editor} />
            <Divider className='mli-5' />
            <EditorContent editor={editor} className='overflow-y-auto flex' style={{ minHeight: '400px', maxHeight: '400px' }} />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

export default ProductInformation