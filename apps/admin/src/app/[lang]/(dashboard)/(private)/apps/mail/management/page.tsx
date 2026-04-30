// MUI Imports
import Grid from '@mui/material/Grid2'

/* @Import Components */
import MailManagementListTable from '@views/mail/management/list/MailManagementListTable'

const MailManagementList = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <MailManagementListTable />
            </Grid>
        </Grid>
    )
}

export default MailManagementList