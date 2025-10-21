import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { toast } from 'react-toastify'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import AdminForm from '@/views/manager/add/AddAdmin'

// API
import { fetchRoles } from '@/utils/api/roles'

const AdminAddPage = async () => {
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
        // Rolleri çek
        const rolesRes = await fetch(`${process.env.API_URL}/admin/user/roles`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })

        if (!rolesRes.ok) {
            console.error('Roller yüklenemedi:', rolesRes.status)
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Roller Yüklenemedi</h2>
                    <p>Lütfen daha sonra tekrar deneyin.</p>
                </div>
            )
        }

        const rolesData = await rolesRes.json()

        return <AdminForm roles={rolesData.data?.roles || []} />
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

export default AdminAddPage