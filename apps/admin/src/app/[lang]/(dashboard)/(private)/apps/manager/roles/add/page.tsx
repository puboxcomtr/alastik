import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import RoleForm from '@/views/manager/roles/AddRole'

const RoleCreatePage = async () => {
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

        return <RoleForm modules={modulesData.data?.modules || {}} />
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

export default RoleCreatePage