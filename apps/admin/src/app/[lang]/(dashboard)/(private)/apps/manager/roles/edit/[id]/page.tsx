import { getServerSession } from 'next-auth/next'
import { redirect, notFound } from 'next/navigation'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'

import RoleForm from '@/views/manager/roles/AddRole'

import { fetchAPI } from '@libs/api'

type Props = {
    params: {
        id: string
    }
}

const RoleEditPage = async ({ params }: Props) => {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        redirect('/login')
    }

    const token = (session.user as any).accessToken

    if (!token) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Token Bulunamadı</h2>
                <p>Lütfen çıkış yapıp tekrar giriş yapın.</p>
            </div>
        )
    }

    try {
        const modulesData = await fetchAPI(`${process.env.API_URL}/admin/user/roles/modules`, {
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        const roleData = await fetchAPI(`${process.env.API_URL}/admin/user/roles/${params.id}`, {
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        if (!roleData.data?.role) {
            notFound()
        }

        return <RoleForm modules={modulesData.data?.modules || {}} role={roleData.data?.role} isEdit />
    } catch (error) {
        console.error('Sayfa yükleme hatası:', error)
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Bir Hata Oluştu</h2>
                <p>Sayfa yüklenirken bir hata oluştu. Lütfen tekrar deneyin.</p>
            </div>
        )
    }
}

export default RoleEditPage