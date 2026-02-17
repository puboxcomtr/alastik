import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { API_ENDPOINTS } from '@libs/api'

// Auth
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Component Imports
import XmlRulesForm from '@/views/modules/xmlRules/XmlRulesForm'

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
        // XML entegrasyon bilgisini çek
        const xmlRes = await fetch(API_ENDPOINTS.webxml.detail(params.id), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })

        if (!xmlRes.ok) {
            console.error('XML bilgisi yüklenemedi:', xmlRes.status)
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>XML Entegrasyonu Bulunamadı</h2>
                    <p>Lütfen geçerli bir entegrasyon seçin.</p>
                </div>
            )
        }

        const xmlData = await xmlRes.json()

        return <XmlRulesForm xmlData={xmlData.data} />
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

export default XmlRulesPage