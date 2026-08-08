import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import XmlRulesForm from '@/views/modules/xml/xmlRules/XmlRulesForm'

type Props = {
    params: { id: string }
}

const XmlRulesPage = async ({ params }: Props) => {
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
        // XML entegrasyon bilgisini çek (server tarafında token'ı elle iletiyoruz)
        const xmlData = await fetchAPI(API_ENDPOINTS.webxml.detail(params.id), {
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        return <XmlRulesForm xmlData={xmlData.data} />
    } catch (error) {
        console.error('Sayfa yükleme hatası:', error)
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>XML Entegrasyonu Bulunamadı</h2>
                <p>Lütfen geçerli bir entegrasyon seçin.</p>
            </div>
        )
    }
}

export default XmlRulesPage