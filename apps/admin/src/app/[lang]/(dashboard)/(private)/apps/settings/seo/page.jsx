'use client'

import dynamic from 'next/dynamic'
import Seo from '@/views/seo'

const Homepage = dynamic(() => import('@/views/seo/homepage'))
const Category = dynamic(() => import('@/views/seo/category'))
const Brand = dynamic(() => import('@/views/seo/brand'))
const Product = dynamic(() => import('@/views/seo/product'))
const Other = dynamic(() => import('@/views/seo/other'))

const tabContentList = (formData, setFormData, handleSave, saving) => ({
    tab1: <Homepage formData={formData} setFormData={setFormData} handleSave={handleSave} saving={saving} />,
    tab2: <Category formData={formData} setFormData={setFormData} handleSave={handleSave} saving={saving} />,
    tab3: <Brand formData={formData} setFormData={setFormData} handleSave={handleSave} saving={saving} />,
    tab4: <Product formData={formData} setFormData={setFormData} handleSave={handleSave} saving={saving} />,
    tab5: <Other formData={formData} setFormData={setFormData} handleSave={handleSave} saving={saving} />
})

const SeoSettings = () => {
    return <Seo tabContentList={tabContentList} />
}

export default SeoSettings