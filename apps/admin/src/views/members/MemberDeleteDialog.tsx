'use client'

import { useState } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import { fullName } from './types'

type Props = {
    member: { _id: string; firstName?: string; lastName?: string; email?: string } | null
    onClose: () => void
    onDeleted: (id: string) => void
}

const MemberDeleteDialog = ({ member, onClose, onDeleted }: Props) => {
    const [deleting, setDeleting] = useState(false)

    const confirm = async () => {
        if (!member) return
        setDeleting(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.members.remove(member._id), { method: 'DELETE' })

            if (res.success) {
                toast.success(res.message || 'Üye silindi olarak işaretlendi')
                onDeleted(member._id)
                onClose()
            } else {
                toast.error(res.message || 'Üye silinemedi')
            }
        } catch {
            toast.error('Üye silinemedi')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Dialog open={Boolean(member)} onClose={() => !deleting && onClose()}>
            <DialogTitle>Üyeyi sil</DialogTitle>
            <DialogContent>
                <Typography>
                    <strong>{member ? fullName(member) : ''}</strong> silinmiş olarak işaretlenecek. Siparişleri ve geçmişi korunur; üye siteye giriş yapamaz.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button color='secondary' onClick={onClose} disabled={deleting}>Vazgeç</Button>
                <Button color='error' variant='contained' onClick={confirm} disabled={deleting}>Sil</Button>
            </DialogActions>
        </Dialog>
    )
}

export default MemberDeleteDialog
