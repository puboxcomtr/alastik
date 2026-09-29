// Next Imports
import { redirect } from 'next/navigation'

// SEO Analizi kendi sekmesine taşındı (SEO > Genel Rapor); eski adres yönlendirilir
const AnalyticsSeoPage = ({ params }: { params: { lang: string } }) => {
    redirect(`/${params.lang}/apps/seo/report`)
}

export default AnalyticsSeoPage
