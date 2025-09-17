// MUI Imports
import Grid from '@mui/material/Grid2'

// Components Imports
import CardStatVertical from '@components/card-statistics/Vertical'
import TotalProfitStackedBar from '@views/dashboards/ecommerce/TotalProfitStackedBar'
import Transactions from '@views/dashboards/ecommerce/Transactions'
import WebsiteStatistics from '@views/dashboards/ecommerce/WebsiteStatistics'
import Table from '@views/dashboards/ecommerce/Table'

import MeetingSchedule from '@views/dashboards/ecommerce/MeetingSchedule'
import TotalSales from '@views/dashboards/ecommerce/TotalSales'
import LineChartWithShadow from '@views/dashboards/ecommerce/LineChartWithShadow'
import RadialBarChart from '@views/dashboards/ecommerce/RadialBarChart'
import NewVisitors from '@views/dashboards/ecommerce/NewVisitors'

// Data Imports
import { getInvoiceData } from '@/app/server/actions'

/**
 * ! If you need data using an API call, uncomment the below API code, update the `process.env.API_URL` variable in the
 * ! `.env` file found at root of your project and also update the API endpoints like `/apps/user-list` in below example.
 * ! Also, remove the above server action import and the action itself from the `src/app/server/actions.ts` file to clean up unused code
 * ! because we've used the server action for getting our static data.
 */

/* const getData = async () => {
  // Vars
  const res = await fetch(`${process.env.API_URL}/apps/invoice`)

  if (!res.ok) {
    throw new Error('Failed to fetch invoice data')
  }

  return res.json()
} */
const DashboardECommerce = async () => {
  // Vars
  const data = await getInvoiceData()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <CardStatVertical
              title='Toplam Satış Tutarı'
              stats='38.250,00 TL'
              avatarIcon='ri-wallet-2-line'
              avatarColor='success'
              trendNumber='12%'
              trend='positive'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <CardStatVertical
              title='Toplam Sipariş'
              stats='12 Adet'
              avatarIcon='ri-shopping-cart-line'
              avatarColor='info'
              trendNumber='14%'
              trend='positive'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <CardStatVertical
              title='Onay Bekleyen Sipariş'
              stats='1 Adet'
              avatarIcon='ri-alarm-line'
              avatarColor='error'
              trendNumber='4%'
              trend='positive'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <CardStatVertical
              title='Yeni Üye'
              stats='3 Üye'
              avatarIcon='ri-bank-card-line'
              avatarColor='warning'
              trendNumber='6%'
              trend='positive'
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, md: 12 }}>
        <TotalProfitStackedBar />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <WebsiteStatistics />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Transactions />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }} className='order-last lg:order-[unset]'>
        <Table invoiceData={data.slice(0, 11)} />
      </Grid>
    </Grid>
  )
}

export default DashboardECommerce
