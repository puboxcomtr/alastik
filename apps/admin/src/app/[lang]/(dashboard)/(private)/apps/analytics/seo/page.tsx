import { redirect } from 'next/navigation'

const AnalyticsSeoPage = ({ params }: { params: { lang: string } }) => {
    redirect(`/${params.lang}/apps/seo/report`)
}

export default AnalyticsSeoPage
