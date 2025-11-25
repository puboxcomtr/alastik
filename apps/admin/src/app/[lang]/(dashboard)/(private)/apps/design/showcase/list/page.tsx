import Grid from '@mui/material/Grid2'
import 'server-only'

import ShowcaseListTable from '@/views/design/showcase/list/ShowcaseListTable'

async function fetchShowcases() {
    const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    const res = await fetch(`${baseUrl}/showcases`, {
        cache: 'no-store',
    })

    if (!res.ok) return { showcases: [] }
    const data = await res.json()

    const showcases = (data.data || []).map((showcase: any) => ({
        id: showcase.id,
        title: showcase.title,
        order: showcase.order,
        itemsPerRow: showcase.itemsPerRow,
        isActive: showcase.isActive,
        productCount: showcase.productCount,
        createdAt: showcase.createdAt,
        updatedAt: showcase.updatedAt
    }))

    return { showcases }
}

const ShowcaseListPage = async () => {
    const data = await fetchShowcases()

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <ShowcaseListTable showcaseData={data?.showcases} />
            </Grid>
        </Grid>
    )
}

export default ShowcaseListPage