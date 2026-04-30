'use client'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

type ConfirmDialogProps = {
    open: boolean
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    severity?: 'warning' | 'error' | 'info' | 'success'
    loading?: boolean
    onConfirm: () => void
    onClose: () => void
}

const severityConfig = {
    warning: { icon: 'ri-alert-line', color: 'warning.main', btnColor: 'warning' as const },
    error: { icon: 'ri-error-warning-line', color: 'error.main', btnColor: 'error' as const },
    info: { icon: 'ri-information-line', color: 'info.main', btnColor: 'primary' as const },
    success: { icon: 'ri-checkbox-circle-line', color: 'success.main', btnColor: 'success' as const }
}

const ConfirmDialog = ({
    open,
    title = 'Emin misiniz?',
    message,
    confirmText = 'Evet, Devam Et',
    cancelText = 'İptal',
    severity = 'warning',
    loading = false,
    onConfirm,
    onClose
}: ConfirmDialogProps) => {
    const config = severityConfig[severity]

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth='xs' fullWidth>
            <DialogTitle>
                <Box className='flex items-center gap-3'>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: theme => `${config.color}20`,
                            color: config.color
                        }}
                    >
                        <i className={`${config.icon} text-2xl`} />
                    </Box>
                    <Typography variant='h5' component='span'>
                        {title}
                    </Typography>
                </Box>
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Typography variant='body1' color='text.secondary'>
                    {message}
                </Typography>
            </DialogContent>
            <Divider />
            <DialogActions className='p-4'>
                <Button onClick={onClose} variant='outlined' color='secondary' disabled={loading}>
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant='contained'
                    color={config.btnColor}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color='inherit' /> : null}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ConfirmDialog