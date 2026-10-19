import Grid from '@mui/material/Grid2'

import SalespersonsView from '@views/salespersons/SalespersonsView'

const SalespersonsListPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <SalespersonsView />
            </Grid>
        </Grid>
    )
}

export default SalespersonsListPage
