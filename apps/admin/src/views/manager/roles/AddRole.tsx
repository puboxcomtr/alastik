'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { useSession } from 'next-auth/react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

type ModuleDefinition = {
    key: string
    name: string
    category: string
    actions: string[]
}

type ModulesByCategory = {
    [category: string]: ModuleDefinition[]
}

type RoleType = {
    _id: string
    name: string
    description?: string
    permissions: Array<{
        module: string
        view: boolean
        create: boolean
        edit: boolean
        delete: boolean
        sync: boolean
    }>
    isSystem: boolean
    status: 'active' | 'inactive'
}

type RoleFormProps = {
    modules: ModulesByCategory
    role?: RoleType
    isEdit?: boolean
}

const RoleForm = ({ modules, role, isEdit = false }: RoleFormProps) => {
    const router = useRouter()
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: role?.name || '',
        description: role?.description || '',
        status: (role?.status || 'active') as const,
        permissions: role?.permissions || [] as Array<{
            module: string
            view: boolean
            create: boolean
            edit: boolean
            delete: boolean
            sync: boolean
        }>
    })

    // Role değiştiğinde form'u güncelle
    useEffect(() => {
        if (role) {
            setFormData({
                name: role.name,
                description: role.description || '',
                status: role.status,
                permissions: role.permissions || []
            })
        }
    }, [role])

    const handlePermissionChange = (moduleKey: string, action: string, checked: boolean) => {
        setFormData(prev => {
            const existingPermIndex = prev.permissions.findIndex(p => p.module === moduleKey)

            if (existingPermIndex >= 0) {
                const newPermissions = [...prev.permissions]
                newPermissions[existingPermIndex] = {
                    ...newPermissions[existingPermIndex],
                    [action]: checked
                }
                return { ...prev, permissions: newPermissions }
            } else {
                return {
                    ...prev,
                    permissions: [
                        ...prev.permissions,
                        {
                            module: moduleKey,
                            view: action === 'view' ? checked : false,
                            create: action === 'create' ? checked : false,
                            edit: action === 'edit' ? checked : false,
                            delete: action === 'delete' ? checked : false,
                            sync: action === 'sync' ? checked : false
                        }
                    ]
                }
            }
        })
    }

    const isActionChecked = (moduleKey: string, action: string) => {
        const perm = formData.permissions.find(p => p.module === moduleKey)
        return perm ? perm[action as keyof typeof perm] === true : false
    }

    const handleSelectAll = () => {
        const allPermissions: typeof formData.permissions = []

        Object.values(modules).forEach(categoryModules => {
            categoryModules.forEach(mod => {
                allPermissions.push({
                    module: mod.key,
                    view: mod.actions.includes('view'),
                    create: mod.actions.includes('create'),
                    edit: mod.actions.includes('edit'),
                    delete: mod.actions.includes('delete'),
                    sync: mod.actions.includes('sync')
                })
            })
        })

        setFormData(prev => ({ ...prev, permissions: allPermissions }))
        toast.success('Tüm izinler seçildi')
    }

    const handleDeselectAll = () => {
        setFormData(prev => ({ ...prev, permissions: [] }))
        toast.success('Tüm izinler kaldırıldı')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error('Lütfen rol adını girin')
            return
        }

        if (formData.permissions.length === 0) {
            toast.error('Lütfen en az bir izin seçin')
            return
        }

        if (!session || !(session.user as any)?.accessToken) {
            toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
            return
        }

        const token = (session.user as any).accessToken
        setLoading(true)

        try {
            const apiUrl = isEdit
                ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'}/admin/user/roles/${role?._id}`
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'}/admin/user/roles`

            const response = await fetch(apiUrl, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || `Rol ${isEdit ? 'güncellenemedi' : 'oluşturulamadı'}`)
            }

            if (!data.success) {
                throw new Error(data.message || `Rol ${isEdit ? 'güncellenemedi' : 'oluşturulamadı'}`)
            }

            toast.success(`Rol başarıyla ${isEdit ? 'güncellendi' : 'oluşturuldu'}`)
            router.push('/apps/manager/roles/list')
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || `Rol ${isEdit ? 'güncellenirken' : 'oluşturulurken'} bir hata oluştu`)
        } finally {
            setLoading(false)
        }
    }

    const getTotalSelectedPermissions = () => {
        return formData.permissions.reduce((sum, p) => {
            return sum +
                (p.view ? 1 : 0) +
                (p.create ? 1 : 0) +
                (p.edit ? 1 : 0) +
                (p.delete ? 1 : 0) +
                (p.sync ? 1 : 0)
        }, 0)
    }

    const allModules = Object.values(modules).flat()

    if (!modules || allModules.length === 0) {
        return (
            <Grid container spacing={6} className='flex items-center justify-center'>
                <Grid item xs={12} lg={10} xl={8}>
                    <Card>
                        <CardContent>
                            <Alert severity='warning'>
                                Hiç modül bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.
                            </Alert>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Button
                                    variant='contained'
                                    onClick={() => router.push('/apps/manager/roles/list')}
                                >
                                    Geri Dön
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        )
    }

    // Sistem rolü düzenleme engeli
    if (isEdit && role?.isSystem) {
        return (
            <Grid container spacing={6} className='flex items-center justify-center'>
                <Grid item xs={12} lg={10} xl={8}>
                    <Card>
                        <CardContent>
                            <Alert severity='error'>
                                Sistem rolleri düzenlenemez.
                            </Alert>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Button
                                    variant='contained'
                                    onClick={() => router.push('/apps/manager/roles/list')}
                                >
                                    Geri Dön
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        )
    }

    return (
        <Grid container spacing={6} className='flex items-center justify-center'>
            <Grid item xs={12} lg={10} xl={8}>
                <Card>
                    <CardHeader
                        title={isEdit ? 'Yetki Düzenle' : 'Yeni Yetki Ekle'}
                        subheader='Yetki İzinlerini Ayarla'
                    />
                    <CardContent>
                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={5}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label='Yetki Adı'
                                        placeholder='Yetki adını girin'
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                        disabled={loading}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label='Açıklama'
                                        placeholder='Rol açıklaması (opsiyonel)'
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        multiline
                                        rows={2}
                                        disabled={loading}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Box>
                                            <Typography variant='h6'>Yetki İzinleri</Typography>
                                            <Typography variant='caption' color='text.secondary'>
                                                Toplam: {getTotalSelectedPermissions()} izin seçildi
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Button
                                                size='small'
                                                variant='text'
                                                onClick={handleSelectAll}
                                                disabled={loading}
                                                sx={{ mr: 1 }}
                                            >
                                                Hepsini Seç
                                            </Button>
                                            <Button
                                                size='small'
                                                variant='text'
                                                color='secondary'
                                                onClick={handleDeselectAll}
                                                disabled={loading}
                                            >
                                                Hepsini Kaldır
                                            </Button>
                                        </Box>
                                    </Box>
                                    <Divider />
                                </Grid>

                                <Grid item xs={12}>
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Modül</TableCell>
                                                    <TableCell align='center'>Görüntüleme</TableCell>
                                                    <TableCell align='center'>Ekleme</TableCell>
                                                    <TableCell align='center'>Düzenleme</TableCell>
                                                    <TableCell align='center'>Silme</TableCell>
                                                    <TableCell align='center'>Senkronizasyon</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {allModules.map(module => (
                                                    <TableRow key={module.key} hover>
                                                        <TableCell>
                                                            <Typography variant='body2' fontWeight={500}>
                                                                {module.name}
                                                            </Typography>
                                                            <Typography variant='caption' color='text.secondary'>
                                                                {module.category}
                                                            </Typography>
                                                        </TableCell>
                                                        {['view', 'create', 'edit', 'delete', 'sync'].map(action => (
                                                            <TableCell key={action} align='center'>
                                                                {module.actions.includes(action) ? (
                                                                    <Checkbox
                                                                        checked={isActionChecked(module.key, action)}
                                                                        onChange={(e) => handlePermissionChange(module.key, action, e.target.checked)}
                                                                        disabled={loading}
                                                                    />
                                                                ) : (
                                                                    <Typography variant='body2' color='text.disabled'>
                                                                        -
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Grid>

                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
                                        <Button
                                            variant='contained'
                                            type='submit'
                                            disabled={loading || !formData.name}
                                            size='large'
                                            startIcon={loading ? <CircularProgress size={20} /> : null}
                                        >
                                            {loading ? (isEdit ? 'Güncelleniyor...' : 'Kaydediliyor...') : (isEdit ? 'Güncelle' : 'Kaydet')}
                                        </Button>
                                        <Button
                                            variant='outlined'
                                            color='secondary'
                                            onClick={() => router.push('/apps/manager/roles/list')}
                                            disabled={loading}
                                            size='large'
                                        >
                                            İptal
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </form>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}

export default RoleForm