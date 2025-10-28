import Grid from '@mui/material/Grid2'
import 'server-only'

import SliderTable from '@views/design/slider/SliderTable'

const SliderPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <SliderTable />
            </Grid>
        </Grid>
    )
}

export default SliderPage