// MUI Imports
import Grid from '@mui/material/Grid2'

// Component Imports
import Payment from './Payment'
import TwoFactorAuthenticationCard from './TwoFactorAuthenticationCard'
import CreateApiKey from './CreateApiKey'
import ApiKeyList from './ApiKeyList'
import RecentDevicesTable from './RecentDevicesTable'

const Showcase = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Payment />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TwoFactorAuthenticationCard />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CreateApiKey />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <ApiKeyList />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RecentDevicesTable />
      </Grid>
    </Grid>
  )
}

export default Showcase
