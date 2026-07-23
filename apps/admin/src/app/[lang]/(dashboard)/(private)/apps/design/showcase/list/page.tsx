import Grid from '@mui/material/Grid2'

import ShowcaseListTable from '@/views/design/showcase/list/ShowcaseListTable'

const ShowcaseListPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <ShowcaseListTable />
            </Grid>
        </Grid>
    )
}

export default ShowcaseListPage