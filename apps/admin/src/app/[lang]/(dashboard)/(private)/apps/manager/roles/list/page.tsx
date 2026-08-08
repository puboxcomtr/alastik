import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import RoleListTable from '@/views/manager/roles/RoleListTable'

// API Imports
import { fetchAPI } from '@libs/api'

// Type Imports
export type RoleType = {
    _id: string
    name: string
    description: string
    permissions: {
        module: string
        view: boolean
        create: boolean
        edit: boolean
        delete: boolean
        sync: boolean
    }[]
    isSystem: boolean
    status: 'active' | 'inactive'
    userCount?: number
    createdAt: Date
    updatedAt: Date
}

const getRolesData = async (token: string): Promise<RoleType[]> => {
    try {
        const response = await fetchAPI(`${process.env.API_URL}/admin/user/roles?limit=100`, {
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        return response.data?.roles || []
    } catch (error) {
        console.error('Error fetching roles:', error)
        return []
    }
}

const RolesPage = async () => {
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

    const rolesData = await getRolesData(token)

    return <RoleListTable rolesData={rolesData} />
}

export default RolesPage