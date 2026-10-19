import Grid from '@mui/material/Grid2'

import MailAccountListTable from '@views/mail/accounts/list/MailAccountListTable'

const MailAccountsList = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <MailAccountListTable />
      </Grid>
    </Grid>
  )
}

export default MailAccountsList