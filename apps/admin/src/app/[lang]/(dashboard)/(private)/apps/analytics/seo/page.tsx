// MUI Imports
import Grid from '@mui/material/Grid2'

/* @Import Page */
import SeoView from '@/views/analytics/seo/SeoView'

const AnalyticsSeoPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <SeoView />
            </Grid>
        </Grid>
    )
}

export default AnalyticsSeoPage
