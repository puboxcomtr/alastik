'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

import Card from '@mui/material/Card'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

const TABS = [
    { key: 'report', label: 'Genel Rapor', icon: 'ri-line-chart-line', href: '/apps/seo/report' },
    { key: 'content', label: 'İçerik Analizi', icon: 'ri-file-search-line', href: '/apps/seo/content' },
    { key: 'keywords', label: 'Anahtar Kelimeler', icon: 'ri-key-2-line', href: '/apps/seo/keywords' },
    { key: 'settings', label: 'Ayarlar', icon: 'ri-settings-3-line', href: '/apps/settings/seo' }
] as const

export type SeoTabKey = (typeof TABS)[number]['key']

const SeoTabs = ({ active }: { active: SeoTabKey }) => {
    const { lang: locale } = useParams()
    const pathname = usePathname()

    return (
        <Card>
            <Tabs value={active} variant='scrollable' scrollButtons='auto' allowScrollButtonsMobile>
                {TABS.map(tab => (
                    <Tab
                        key={tab.key}
                        value={tab.key}
                        component={Link}
                        href={`/${locale}${tab.href}`}
                        label={tab.label}
                        icon={<i className={`${tab.icon} text-xl`} />}
                        iconPosition='start'
                        aria-current={pathname?.includes(tab.href) ? 'page' : undefined}
                        sx={{ minHeight: 56 }}
                    />
                ))}
            </Tabs>
        </Card>
    )
}

export default SeoTabs
