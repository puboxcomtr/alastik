// Next Imports
import dynamic from 'next/dynamic'

import Seo from '@/views/seo'
const Homepage = dynamic(() => import('@/views/seo/homepage'))
const Category = dynamic(() => import('@/views/seo/category'))
const Brand = dynamic(() => import('@/views/seo/brand'))
const Product = dynamic(() => import('@/views/seo/product'))
const Other = dynamic(() => import('@/views/seo/other'))

// Vars
const tabContentList = () => ({
    tab1: <Homepage />,
    tab2: <Category />,
    tab3: <Brand />,
    tab4: <Product />,
    tab5: <Other />
})

const SeoSettings = () => {
    return <Seo tabContentList={tabContentList()} />
}

export default SeoSettings
