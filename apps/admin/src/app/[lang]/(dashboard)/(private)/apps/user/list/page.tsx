import { Suspense } from 'react'

import Grid from '@mui/material/Grid2'

import MembersView from '@views/members/MembersView'

const UsersListPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Suspense>
                    <MembersView />
                </Suspense>
            </Grid>
        </Grid>
    )
}

export default UsersListPage
