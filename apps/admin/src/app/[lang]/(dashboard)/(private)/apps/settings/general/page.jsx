// Next Imports
import dynamic from 'next/dynamic'

// Component Imports
import Settings from '@views/pages/settings'

const Order = dynamic(() => import('@views/pages/settings/order'))
const Showcase = dynamic(() => import('@views/pages/settings/showcase'))
const BillingPlansTab = dynamic(() => import('@views/pages/settings/billing-plans'))
const NotificationsTab = dynamic(() => import('@views/pages/settings/notifications'))
const ConnectionsTab = dynamic(() => import('@views/pages/settings/connections'))

// Vars
const tabContentList = () => ({
    tab1: <Order />,
    tab2: <Showcase />,
    
    tab3: <BillingPlansTab />,
    tab4: <NotificationsTab />,
    tab5: <ConnectionsTab />
})

const GeneralSettings = () => {
    return <Settings tabContentList={tabContentList()} />
}

export default GeneralSettings
