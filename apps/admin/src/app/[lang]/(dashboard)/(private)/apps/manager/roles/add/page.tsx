import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import RoleForm from '@views/manager/roles/AddRole'

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

    // Modül listesini çek
    const modulesRes = await fetch(`${process.env.API_URL}/admin/user/roles/modules`, {
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const modulesData = modulesRes.ok ? await modulesRes.json() : { data: { modules: {} } }

    return <RoleForm modules={modulesData.data.modules} />
}

export default RoleCreatePage