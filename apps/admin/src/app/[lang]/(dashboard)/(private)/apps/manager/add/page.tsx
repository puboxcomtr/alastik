import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { toast } from 'react-toastify'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import AdminForm from '@/views/manager/add/AddAdmin'


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
        const rolesData = await fetchAPI(API_ENDPOINTS.roles.list(), {
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

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