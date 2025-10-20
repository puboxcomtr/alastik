import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

// Auth options import et
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import ManagerList from '@/views/manager/index'

// Type Imports
export type AdminType = {
    _id: string
    name: string
    email: string
    role: string
    isActive: boolean
    avatar: string | null
    lastLogin: Date | null
    permissions: string[]
    createdAt: Date
    updatedAt: Date
}

const getManagersData = async (token: string): Promise<AdminType[]> => {
    try {
        console.log('🔑 Gönderilen Token:', token.substring(0, 50) + '...')
        console.log('🔗 API URL:', `${process.env.API_URL}/admin/user/admins`)

        const res = await fetch(`${process.env.API_URL}/admin/user/admins?limit=100`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })

        console.log('📊 Response Status:', res.status)

        const responseText = await res.text()
        console.log('📄 Response:', responseText)

        if (!res.ok) {
            return []
        }

        const response = JSON.parse(responseText)
        return response.data?.admins || []
    } catch (error) {
        console.error('❌ Error fetching managers:', error)
        return []
    }
}

const ManagerListPage = async () => {
    const session = await getServerSession(authOptions)

    console.log('📋 Full Session:', JSON.stringify(session, null, 2))

    if (!session || !session.user) {
        redirect('/login')
    }

    const token = (session.user as any).accessToken

    console.log('🔑 Token from session:', token)

    if (!token) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Token Bulunamadı</h2>
                <p>Lütfen çıkış yapıp tekrar giriş yapın.</p>
                <p>Session: {JSON.stringify(session.user)}</p>
            </div>
        )
    }

    const managersData = await getManagersData(token)

    return <ManagerList managersData={managersData} />
}

export default ManagerListPage