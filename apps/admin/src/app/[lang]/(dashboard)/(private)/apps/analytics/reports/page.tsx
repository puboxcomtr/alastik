import Grid from '@mui/material/Grid2'

import ReportsView from '@/views/analytics/reports/ReportsView'

const AnalyticsReportsPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <ReportsView />
            </Grid>
        </Grid>
    )
}

export default AnalyticsReportsPage
