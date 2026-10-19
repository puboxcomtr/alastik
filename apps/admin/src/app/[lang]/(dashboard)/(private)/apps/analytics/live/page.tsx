import Grid from '@mui/material/Grid2'

import LiveView from '@/views/analytics/live/LiveView'

const AnalyticsLivePage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <LiveView />
            </Grid>
        </Grid>
    )
}

export default AnalyticsLivePage
