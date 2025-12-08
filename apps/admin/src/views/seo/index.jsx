'use client'

import { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid2'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'

import CustomTabList from '@core/components/mui/TabList'
import { getSeoSettings, updateSeoSettings } from '@/utils/api/seo'

const SEO = ({ tabContentList }) => {
  const [activeTab, setActiveTab] = useState('tab1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    homepage: {
      title: '',
      description: '',
      keywords: ''
    },
    category: {
      titleTemplate: '',
      descriptionTemplate: '',
      keywordsTemplate: ''
    },
    brand: {
      titleTemplate: '',
      descriptionTemplate: '',
      keywordsTemplate: ''
    },
    product: {
      titleTemplate: '',
      descriptionTemplate: '',
      keywordsTemplate: ''
    },
    other:{
      
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getSeoSettings()

      setFormData({
        homepage: data.homepage || { title: '', description: '', keywords: '' },
        category: data.category || { titleTemplate: '', descriptionTemplate: '', keywordsTemplate: '' },
        brand: data.brand || { titleTemplate: '', descriptionTemplate: '', keywordsTemplate: '' },
        product: data.product || { titleTemplate: '', descriptionTemplate: '', keywordsTemplate: '' },
        other: data.other || {}
      })
    } catch (error) {
      toast.error('SEO ayarları yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateSeoSettings(formData)
      toast.success('Tüm SEO ayarları kaydedildi')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'SEO ayarları kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (event, value) => {
    setActiveTab(value)
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center p-10'>
        <CircularProgress />
      </div>
    )
  }

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab label='Anasayfa' value='tab1' />
            <Tab label='Kategori Sayfası' value='tab2' />
            <Tab label='Marka Sayfası' value='tab3' />
            <Tab label='Ürün Sayfası' value='tab4' />
            <Tab label='Diğer SEO Ayarları' value='tab5' />
          </CustomTabList>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TabPanel value={activeTab} className='p-0'>
            {tabContentList(formData, setFormData, handleSave, saving)[activeTab]}
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default SEO