import Grid from '@mui/material/Grid2'

import EditShowcaseForm from '@/views/design/showcase/edit/EditShowcaseForm'

const EditShowcasePage = ({ params }: { params: { id: string } }) => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <EditShowcaseForm showcaseId={params.id} />
            </Grid>
        </Grid>
    )
}

export default EditShowcasePage
