import Grid from '@mui/material/Grid2'

import Settings from '@/views/modules/akakce/Settings'

const akakceModules = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Settings />
            </Grid>
        </Grid>
    )
}

export default akakceModules
