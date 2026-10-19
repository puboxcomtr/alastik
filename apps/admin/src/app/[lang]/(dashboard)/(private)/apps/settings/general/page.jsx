import dynamic from 'next/dynamic'

import Settings from '@/views/settings'

const Order = dynamic(() => import('@/views/settings/order'))
const Showcase = dynamic(() => import('@/views/settings/showcase'))
const Member = dynamic(() => import('@/views/settings/member'))
const Campaign = dynamic(() => import('@/views/settings/campaign'))
const Other = dynamic(() => import('@/views/settings/other'))

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
