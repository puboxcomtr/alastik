import Grid from '@mui/material/Grid2'
import 'server-only'

import AddShowcaseForm from '@/views/design/showcase/add/AddShowcaseForm'

const AddShowcasePage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <AddShowcaseForm />
            </Grid>
        </Grid>
    )
}

export default AddShowcasePage