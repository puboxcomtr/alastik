import { Suspense } from 'react'

import Grid from '@mui/material/Grid2'
import 'server-only'

import AddMenuForm from '@views/design/menu/AddMenuForm'

const AddMenuPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Suspense>
                    <AddMenuForm />
                </Suspense>
            </Grid>
        </Grid>
    )
}

export default AddMenuPage