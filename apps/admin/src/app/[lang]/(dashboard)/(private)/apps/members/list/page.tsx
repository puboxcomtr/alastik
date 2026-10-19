import Grid from '@mui/material/Grid2'

import MemberListTable from '@views/members/MemberListTable'

const MembersListPage = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <MemberListTable />
      </Grid>
    </Grid>
  )
}

export default MembersListPage
