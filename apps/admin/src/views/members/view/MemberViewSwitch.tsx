'use client'

// Üye/Cari detay sayfası: aktif site b2b ise cari düzenleme ekranı, değilse üye detayı.
// Aktif site localStorage'da tutulduğu için seçim istemcide yapılır.
import { useEffect, useState } from 'react'

import CircularProgress from '@mui/material/CircularProgress'

import { getActiveSite, getMemberMenuLabels } from '@/utils/activeSite'

import MemberViewPage from './MemberViewPage'
import CariEditView from '../cari/CariEditView'

const MemberViewSwitch = () => {
    const [cariModu, setCariModu] = useState<boolean | null>(null)

    useEffect(() => {
        setCariModu(!!getMemberMenuLabels(getActiveSite()))
    }, [])

    if (cariModu === null) {
        return (
            <div className='flex items-center justify-center' style={{ minHeight: '300px' }}>
                <CircularProgress size={28} />
            </div>
        )
    }

    return cariModu ? <CariEditView /> : <MemberViewPage />
}

export default MemberViewSwitch
