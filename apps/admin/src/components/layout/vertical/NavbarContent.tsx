'use client'

import { useEffect, useRef, useState } from 'react'

import classnames from 'classnames'

import type { ShortcutsType } from '@components/layout/shared/ShortcutsDropdown'
import type { NotificationsType } from '@components/layout/shared/NotificationsDropdown'

import NavToggle from './NavToggle'
import NavSearch from '@components/layout/shared/search'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import NotificationsDropdown from '@components/layout/shared/NotificationsDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'
import SiteSelector from '@components/layout/shared/SiteSelector'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const shortcuts: ShortcutsType[] = [
  {
    url: '/apps/invoice/list',
    title: 'Siparişler',
    subtitle: 'Manage Accounts'
  },
  {
    url: '/apps/calendar',
    icon: 'ri-calendar-line',
    title: 'Calendar',
    subtitle: 'Appointments'
  },
  {
    url: '/apps/user/list',
    icon: 'ri-user-3-line',
    title: 'Users',
    subtitle: 'Manage Users'
  },
  {
    url: '/apps/roles',
    icon: 'ri-computer-line',
    title: 'Role Management',
    subtitle: 'Permissions'
  },
  {
    url: '/dashboards/crm',
    icon: 'ri-pie-chart-2-line',
    title: 'Dashboard',
    subtitle: 'User Dashboard'
  },
  {
    url: '/pages/account-settings',
    icon: 'ri-settings-4-line',
    title: 'Settings',
    subtitle: 'Account Settings'
  }
]

type NotificationItem = {
  type: 'search' | 'callback' | 'contact'
  title: string
  subtitle: string
  meta: string
  at: string
  read: boolean
}

const NOTIFICATION_REFRESH_MS = 60_000

const TYPE_AVATAR: Record<NotificationItem['type'], { icon: string; color: 'info' | 'success' | 'primary' }> = {
  search: { icon: 'ri-search-line', color: 'info' },
  callback: { icon: 'ri-phone-line', color: 'success' },
  contact: { icon: 'ri-mail-line', color: 'primary' }
}

const relativeTime = (iso: string) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)

  if (min < 1) return 'az önce'
  if (min < 60) return `${min} dk önce`
  const hours = Math.floor(min / 60)

  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)

  if (days < 30) return `${days} gün önce`

  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

const toDropdownItem = (item: NotificationItem): NotificationsType => ({
  avatarIcon: TYPE_AVATAR[item.type].icon,
  avatarColor: TYPE_AVATAR[item.type].color,
  title: item.title,
  subtitle: [item.subtitle, item.meta].filter(Boolean).join(' · '),
  time: relativeTime(item.at),
  read: item.read
})

const NavbarContent = () => {
  const [notifications, setNotifications] = useState<NotificationsType[]>([])
  const inFlightRef = useRef(false)

  useEffect(() => {
    const load = async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const res = await fetchAPI(API_ENDPOINTS.analytics.notifications(), { cache: 'no-store' })

        if (res.success && Array.isArray(res.data?.items)) {
          setNotifications((res.data.items as NotificationItem[]).map(toDropdownItem))
        }
      } catch (error) {
        console.error('Notifications fetch error:', error)
      } finally {
        inFlightRef.current = false
      }
    }

    load()

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      load()
    }, NOTIFICATION_REFRESH_MS)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-[7px]'>
        <NavToggle />
        <SiteSelector />
      </div>
      <div className='flex items-center'>
        <ShortcutsDropdown shortcuts={shortcuts} />
        <NotificationsDropdown notifications={notifications} />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
