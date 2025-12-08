'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

// Type Imports
import type { AdminType } from '@/app/[lang]/(dashboard)/(private)/apps/manager/list/page'

// Component Imports
import ManagerListTable from './list/ManagerListTable'

const ManagerList = ({ managersData }: { managersData: AdminType[] }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const router = useRouter()

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    const handleMenuAction = (path: string) => {
        router.push(path)
        handleMenuClose()
    }

    return (
        <Card>
            <CardHeader
                title='Yönetici Kullanıcılar'
                action={
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Button
                            variant='outlined'
                            color='secondary'
                            startIcon={<i className='ri-settings-3-line' />}
                            onClick={handleMenuOpen}
                        >
                            Diğer İşlemler
                        </Button>
                        <Button
                            variant='contained'
                            color='primary'
                            startIcon={<i className='ri-add-line' />}
                            onClick={() => router.push('/apps/manager/add')}
                        >
                            Yeni Yönetici Ekle
                        </Button>
                    </div>
                }
            />
            <ManagerListTable managersData={managersData} />

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={() => handleMenuAction('/apps/manager/roles/list')}>
                    <ListItemIcon>
                        <i className='ri-shield-user-line' style={{ fontSize: '1.25rem' }} />
                    </ListItemIcon>
                    <ListItemText>Yönetici Rolleri</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuAction('/apps/manager/logs')}>
                    <ListItemIcon>
                        <i className='ri-file-list-3-line' style={{ fontSize: '1.25rem' }} />
                    </ListItemIcon>
                    <ListItemText>İşlem Kayıtları</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuAction('/apps/manager/blocked-ips')}>
                    <ListItemIcon>
                        <i className='ri-forbid-line' style={{ fontSize: '1.25rem' }} />
                    </ListItemIcon>
                    <ListItemText>Engellenen IP'ler</ListItemText>
                </MenuItem>
            </Menu>
        </Card>
    )
}
export default ManagerList