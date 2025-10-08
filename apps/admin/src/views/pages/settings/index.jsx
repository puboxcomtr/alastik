'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

// Component Imports
import CustomTabList from '@core/components/mui/TabList'

const Order = ({ tabContentList }) => {
  // States
  const [activeTab, setActiveTab] = useState('tab1')

  const handleChange = (event, value) => {
    setActiveTab(value)
  }

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab label='Sipariş / Kargo' value='tab1' />
            <Tab label='Vitrin ve Ürün' value='tab2' />
            <Tab
              label='Üyelik Yönetimi'
              value='tab3'
            />
            <Tab
              label='Kampanya ve Puan Sistemi'
              value='tab4'
            />
            <Tab label='Ek Ayarlar' value='tab5' />
          </CustomTabList>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TabPanel value={activeTab} className='p-0'>
            {tabContentList[activeTab]}
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default Order
