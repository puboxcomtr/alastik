'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import type { MemberRow } from './types'
import { fullName } from './types'

type Props = {
    member: MemberRow | null
    onClose: () => void
    onSaved: (id: string, adminTags: string[], adminNote: string) => void
}

// Üyeye panel etiketi / not ekleme
const MemberAnnotateDialog = ({ member, onClose, onSaved }: Props) => {
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setTags(member?.adminTags || [])
        setNote(member?.adminNote || '')
        setTagInput('')
    }, [member])

    const addTag = () => {
        const value = tagInput.trim()

        if (!value) return
        if (!tags.includes(value)) setTags([...tags, value])
        setTagInput('')
    }

    const save = async () => {
        if (!member) return
        setSaving(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.members.annotate(member._id), {
                method: 'PUT',
                body: JSON.stringify({ adminTags: tags, adminNote: note })
            })

            if (res.success) {
                toast.success('Etiket ve not kaydedildi')
                onSaved(member._id, res.data?.adminTags || tags, res.data?.adminNote ?? note)
                onClose()
            } else {
                toast.error(res.message || 'Kaydedilemedi')
            }
        } catch {
            toast.error('Kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={Boolean(member)} onClose={onClose} fullWidth maxWidth='sm'>
            <DialogTitle>Etiket / Not — {member ? fullName(member) : ''}</DialogTitle>
            <DialogContent className='flex flex-col gap-4 pbs-2'>
                <div className='flex flex-col gap-2'>
                    <Typography variant='body2' color='text.secondary'>Etiketler</Typography>
                    <div className='flex flex-wrap gap-2'>
                        {tags.map(tag => (
                            <Chip key={tag} label={tag} size='small' variant='tonal' color='primary' onDelete={() => setTags(tags.filter(t => t !== tag))} />
                        ))}
                        {tags.length === 0 ? <Typography variant='body2' color='text.disabled'>Henüz etiket yok</Typography> : null}
                    </div>
                    <div className='flex gap-2'>
                        <TextField
                            size='small'
                            fullWidth
                            placeholder='Etiket yazıp Enter’a basın (örn. VIP, toptancı)'
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addTag()
                                }
                            }}
                        />
                        <Button variant='outlined' onClick={addTag}>Ekle</Button>
                    </div>
                </div>
                <TextField
                    label='Not'
                    multiline
                    minRows={3}
                    value={note}
                    onChange={e => setNote(e.target.value.slice(0, 1000))}
                    helperText={`${note.length}/1000`}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color='secondary'>Vazgeç</Button>
                <Button variant='contained' onClick={save} disabled={saving}>Kaydet</Button>
            </DialogActions>
        </Dialog>
    )
}

export default MemberAnnotateDialog
