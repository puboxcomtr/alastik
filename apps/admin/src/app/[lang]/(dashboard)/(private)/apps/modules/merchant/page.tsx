import Grid from '@mui/material/Grid2'
import Settings from '@/views/modules/merchant/Settings'

const MerchantPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Settings />
            </Grid>
        </Grid>
    )
}

export default MerchantPage