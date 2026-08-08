// MUI Imports
import Grid from '@mui/material/Grid2'

/* @Import Page */
import DiaSettingsBySite from '@/views/modules/dia/DiaSettingsBySite'

const diaModules = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <DiaSettingsBySite />
            </Grid>
        </Grid>
    )
}

export default diaModules
