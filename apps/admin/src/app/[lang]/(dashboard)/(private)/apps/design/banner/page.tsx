import Grid from '@mui/material/Grid2'
import 'server-only'

import BannerTable from '@views/design/banner/BannerTable'

const BannerPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <BannerTable />
            </Grid>
        </Grid>
    )
}

export default BannerPage