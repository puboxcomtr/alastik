// MUI Imports
import Grid from '@mui/material/Grid2'

// Components Imports
import CardStatVertical from '@views/dashboard/Vertical'
import TotalProfitStackedBar from '@views/dashboard/TotalProfitStackedBar'
import Transactions from '@views/dashboard/Transactions'
import WebsiteStatistics from '@views/dashboard/WebsiteStatistics'
import Table from '@views/dashboard/Table'

import MeetingSchedule from '@views/dashboard/MeetingSchedule'
import TotalSales from '@views/dashboard/TotalSales'

export const metadata = {
    title: "Yönetici Paneli - Türkiye'nin En Yaygın Lastikçisi",
    description: 'ALastik Yönetim Paneli'
}

const EcommerceDashboard = () => {

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
                <Table />
            </Grid>
        </Grid>
    )
}

export default EcommerceDashboard