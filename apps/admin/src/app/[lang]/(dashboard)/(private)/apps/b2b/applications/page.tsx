import Grid from '@mui/material/Grid2'

import ApplicationsList from '@views/b2b/ApplicationsList'

const B2BApplicationsPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <ApplicationsList />
            </Grid>
        </Grid>
    )
}

export default B2BApplicationsPage
