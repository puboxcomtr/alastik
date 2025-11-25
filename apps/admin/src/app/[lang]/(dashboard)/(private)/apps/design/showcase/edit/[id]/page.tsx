import Grid from '@mui/material/Grid2'
import 'server-only'

import EditShowcaseForm from '@/views/design/showcase/edit/EditShowcaseForm'

async function fetchShowcase(id: string) {
    const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

    const res = await fetch(`${baseUrl}/showcases/${id}`, {
        cache: 'no-store',
    })

    if (!res.ok) return null
    const data = await res.json()

    return data.data
}

const EditShowcasePage = async ({ params }: { params: { id: string } }) => {
    const showcase = await fetchShowcase(params.id)

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <EditShowcaseForm showcaseData={showcase} />
            </Grid>
        </Grid>
    )
}

export default EditShowcasePage