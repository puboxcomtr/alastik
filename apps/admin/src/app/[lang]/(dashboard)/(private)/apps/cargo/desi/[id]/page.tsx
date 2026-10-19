import Grid from '@mui/material/Grid2'

import DesiPricingPage from '@views/cargo/DesiPricingPage'

const CargoDesiPricingPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <DesiPricingPage />
            </Grid>
        </Grid>
    )
}

export default CargoDesiPricingPage
