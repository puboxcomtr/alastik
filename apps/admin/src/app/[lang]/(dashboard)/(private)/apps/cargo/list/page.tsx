// MUI Imports
import Grid from '@mui/material/Grid2'

/* @Import Page */
import CargoListTable from '@views/cargo/CargoListTable'

const CargoListPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <CargoListTable />
            </Grid>
        </Grid>
    )
}

export default CargoListPage