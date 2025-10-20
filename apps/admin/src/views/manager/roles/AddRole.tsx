'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Chip from '@mui/material/Chip'
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

type RoleFormProps = {
    modules: ModulesByCategory
}

const actionLabels: Record<string, string> = {
    view: 'Görüntüleme',
    create: 'Ekleme',
    edit: 'Düzenleme',
    delete: 'Silme',
    sync: 'Senkronizasyon'
}

const RoleForm = ({ modules }: RoleFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as any[]
    })

    const [expanded, setExpanded] = useState<string[]>(
        Object.keys(modules)
    )

    const handleAccordionChange = (category: string) => {
        setExpanded(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        )
    }

    const handlePermissionChange = (moduleKey: string, action: string, checked: boolean) => {
        setFormData(prev => {
            const existingPermIndex = prev.permissions.findIndex((p: any) => p.module === moduleKey)

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
        const perm = formData.permissions.find((p: any) => p.module === moduleKey)
        return perm ? perm[action] === true : false
    }

    const handleSelectAll = (category: string, action: string) => {
        const categoryModules = modules[category]

        setFormData(prev => {
            let newPermissions = [...prev.permissions]

            categoryModules.forEach(mod => {
                if (!mod.actions.includes(action)) return

                const existingIndex = newPermissions.findIndex((p: any) => p.module === mod.key)

                if (existingIndex >= 0) {
                    newPermissions[existingIndex] = {
                        ...newPermissions[existingIndex],
                        [action]: true
                    }
                } else {
                    newPermissions.push({
                        module: mod.key,
                        view: action === 'view',
                        create: action === 'create',
                        edit: action === 'edit',
                        delete: action === 'delete',
                        sync: action === 'sync'
                    })
                }
            })

            return { ...prev, permissions: newPermissions }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            console.log('Form Data:', formData)

            // Backend çağrısı yapılacak
            setTimeout(() => {
                router.push('/apps/manager/roles/list')
            }, 1000)
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu')
            setLoading(false)
        }
    }

    const getTotalSelectedPermissions = () => {
        return formData.permissions.reduce((sum: number, p: any) => {
            return sum + (p.view ? 1 : 0) + (p.create ? 1 : 0) + (p.edit ? 1 : 0) + (p.delete ? 1 : 0) + (p.sync ? 1 : 0)
        }, 0)
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6}>
                <Grid item xs={12}>
                    <Card>
                        <CardHeader title='Rol Bilgileri' />
                        <CardContent>
                            <Grid container spacing={5}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label='Rol Adı'
                                        placeholder='Admin, Editor, vb.'
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label='Açıklama'
                                        placeholder='Rolün açıklaması'
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardHeader
                            title='Yetkilendirme'
                            action={
                                <Chip
                                    label={`${getTotalSelectedPermissions()} Yetki Seçili`}
                                    color='primary'
                                    variant='tonal'
                                />
                            }
                        />
                        <CardContent>
                            {error && (
                                <Alert severity='error' sx={{ mb: 4 }}>
                                    {error}
                                </Alert>
                            )}

                            {Object.entries(modules).map(([category, categoryModules]) => (
                                <Accordion
                                    key={category}
                                    expanded={expanded.includes(category)}
                                    onChange={() => handleAccordionChange(category)}
                                    sx={{ mb: 2 }}
                                >
                                    <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                                        <Typography variant='h6'>{category}</Typography>
                                        <Chip
                                            label={`${categoryModules.length} Modül`}
                                            size='small'
                                            sx={{ ml: 2 }}
                                            variant='outlined'
                                        />
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box>
                                            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                <Typography variant='body2' sx={{ mr: 2, alignSelf: 'center' }}>
                                                    Hızlı Seçim:
                                                </Typography>
                                                {['view', 'create', 'edit', 'delete', 'sync'].map(action => (
                                                    <Button
                                                        key={action}
                                                        size='small'
                                                        variant='outlined'
                                                        onClick={() => handleSelectAll(category, action)}
                                                    >
                                                        Tüm {actionLabels[action]}
                                                    </Button>
                                                ))}
                                            </Box>

                                            <Divider sx={{ mb: 3 }} />

                                            <Grid container spacing={3}>
                                                {categoryModules.map(module => (
                                                    <Grid item xs={12} key={module.key}>
                                                        <Box sx={{
                                                            p: 3,
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            borderRadius: 1,
                                                            '&:hover': {
                                                                borderColor: 'primary.main',
                                                                bgcolor: 'action.hover'
                                                            }
                                                        }}>
                                                            <Typography variant='subtitle1' sx={{ mb: 2, fontWeight: 600 }}>
                                                                {module.name}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                                {module.actions.map(action => (
                                                                    <FormControlLabel
                                                                        key={action}
                                                                        control={
                                                                            <Checkbox
                                                                                checked={isActionChecked(module.key, action)}
                                                                                onChange={(e) => handlePermissionChange(module.key, action, e.target.checked)}
                                                                            />
                                                                        }
                                                                        label={actionLabels[action]}
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        <Button
                            variant='contained'
                            type='submit'
                            disabled={loading || !formData.name}
                        >
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                        <Button
                            variant='outlined'
                            color='secondary'
                            onClick={() => router.push('/apps/manager/roles/list')}
                            disabled={loading}
                        >
                            İptal
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </form>
    )
}

export default RoleForm