'use client'

import { useEffect, useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

type NoteTemplate = {
    title: string
    content: string
}

interface OrderNoteProps {
    orderId: string
    adminNote?: string
}

const OrderNote = ({ orderId, adminNote = '' }: OrderNoteProps) => {
    const [templates, setTemplates] = useState<NoteTemplate[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [note, setNote] = useState(adminNote)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await fetchAPI(API_ENDPOINTS.orders.noteTemplates())

                if (res.success) setTemplates(res.data || [])
            } catch (error) {
                console.error('Şablonlar yüklenemedi:', error)
            }
        }

        fetchTemplates()
    }, [])

    const handleTemplateSelect = (title: string) => {
        setSelectedTemplate(title)
        const template = templates.find(t => t.title === title)

        if (template) setNote(template.content)
    }

    const handleSave = async () => {
        setSaving(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.orders.adminNote(orderId), {
                method: 'PUT',
                body: JSON.stringify({ note })
            })

            if (res.success) {
                toast.success('Sipariş açıklaması kaydedildi')
            } else {
                toast.error(res.message || 'Açıklama kaydedilemedi')
            }
        } catch (error) {
            toast.error('Açıklama kaydedilirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card className='mbs-6'>
            <CardContent className='flex flex-col gap-4'>
                <Typography variant='h5'>Sipariş Açıklaması</Typography>

                {templates.length > 0 && (
                    <FormControl fullWidth size='small' variant='outlined'>
                        <InputLabel id='note-template-label'>Şablon Seç</InputLabel>
                        <Select
                            labelId='note-template-label'
                            label='Şablon Seç'
                            value={selectedTemplate}
                            onChange={(e) => handleTemplateSelect(e.target.value)}
                        >
                            {templates.map((t, i) => (
                                <MenuItem key={i} value={t.title}>{t.title}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    size='small'
                    placeholder='Sipariş için açıklama yazın veya şablon seçin'
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />

                <Button variant='contained' color='primary' onClick={handleSave} disabled={saving}>
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
            </CardContent>
        </Card>
    )
}

export default OrderNote
