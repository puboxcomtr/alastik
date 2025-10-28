import Grid from '@mui/material/Grid2'
import 'server-only'

import AddMenuForm from '@views/design/menu/AddMenuForm'

const AddMenuPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <AddMenuForm />
            </Grid>
        </Grid>
    )
}

export default AddMenuPage