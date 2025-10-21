import { getServerSession } from 'next-auth/next'
import { redirect, notFound } from 'next/navigation'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import RoleForm from '@/views/manager/roles/AddRole'

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
        // Modülleri çek
        const modulesRes = await fetch(`${process.env.API_URL}/admin/user/roles/modules`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })

        if (!modulesRes.ok) {
            console.error('Modüller yüklenemedi:', modulesRes.status)
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Modüller Yüklenemedi</h2>
                    <p>Lütfen daha sonra tekrar deneyin.</p>
                </div>
            )
        }

        const modulesData = await modulesRes.json()

        // Rol verilerini çek
        const roleRes = await fetch(`${process.env.API_URL}/admin/user/roles/${params.id}`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })

        if (!roleRes.ok) {
            if (roleRes.status === 404) {
                notFound()
            }
            console.error('Rol yüklenemedi:', roleRes.status)
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Rol Yüklenemedi</h2>
                    <p>Lütfen daha sonra tekrar deneyin.</p>
                </div>
            )
        }

        const roleData = await roleRes.json()

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