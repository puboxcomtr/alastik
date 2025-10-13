// Next Imports
import dynamic from 'next/dynamic'

// Component Imports
import Settings from '@/views/apps/settings'

const Order = dynamic(() => import('@/views/apps/settings/order'))
const Showcase = dynamic(() => import('@/views/apps/settings/showcase'))
const Member = dynamic(() => import('@/views/apps/settings/member'))
const Campaign = dynamic(() => import('@/views/apps/settings/campaign'))
const Other = dynamic(() => import('@/views/apps/settings/other'))

// Vars
const tabContentList = () => ({
    tab1: <Order />,
    tab2: <Showcase />,
    tab3: <Member />,
    tab4: <Campaign />,
    tab5: <Other />
})

const GeneralSettings = () => {
    return <Settings tabContentList={tabContentList()} />
}

export default GeneralSettings
