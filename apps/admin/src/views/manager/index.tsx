'use client'

import { useState } from 'react'
// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'

// Type Imports
import type { AdminType } from '@/app/[lang]/(dashboard)/(private)/apps/manager/list/page'

// Component Imports
import ManagerListTable from './list/ManagerListTable'

const ManagerList = ({ managersData }: { managersData: AdminType[] }) => {
    return (
        <Card>
            <CardHeader
                title='Yönetici Kullanıcılar'
                action={
                    <Button
                        variant='contained'
                        color='primary'
                        startIcon={<i className='ri-add-line' />}
                    >
                        Yeni Yönetici Ekle
                    </Button>
                }
            />
            <ManagerListTable managersData={managersData} />
        </Card>
    )
}

export default ManagerList