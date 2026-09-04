// MUI Imports
import Grid from '@mui/material/Grid2'

/* @Import Components */
import MembersView from '@views/members/MembersView'

const UsersListPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <MembersView />
            </Grid>
        </Grid>
    )
}

export default UsersListPage
