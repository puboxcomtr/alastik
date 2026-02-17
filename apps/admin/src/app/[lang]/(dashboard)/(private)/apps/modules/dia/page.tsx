// MUI Imports
import Grid from '@mui/material/Grid2'

/* @Import Page */
import Settings from '@/views/modules/dia/Settings'

const diaModules = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Settings />
            </Grid>
        </Grid>
    )
}

export default diaModules