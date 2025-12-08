'use client'

import { useEffect, useState } from 'react'
import { fetchAdmins } from '@/utils/api/admins' 
import ManagerList from '@/views/manager/index'

const ManagerListPage = () => {
    const [managers, setManagers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchAdmins({ limit: 100 })
                setManagers(data.data?.admins || [])
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) return <div>Yükleniyor...</div>

    return <ManagerList managersData={managers} />
}

export default ManagerListPage