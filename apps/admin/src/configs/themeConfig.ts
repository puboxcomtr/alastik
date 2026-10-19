

import type { ToastPosition } from 'react-toastify'

import type { Mode, Skin, Layout, LayoutComponentPosition, LayoutComponentWidth } from '@/@core/types'

type Navbar = {
  type: LayoutComponentPosition
  contentWidth: LayoutComponentWidth
  floating: boolean
  detached: boolean
  blur: boolean
}

type Footer = {
  type: LayoutComponentPosition
  contentWidth: LayoutComponentWidth
  detached: boolean
}

export type Config = {
  templateName: string
  homePageUrl: string
  settingsCookieName: string
  mode: Mode
  skin: Skin
  semiDark: boolean
  layout: Layout
  layoutPadding: number
  navbar: Navbar
  contentWidth: LayoutComponentWidth
  compactContentWidth: number
  footer: Footer
  disableRipple: boolean
  toastPosition: ToastPosition
}

const themeConfig: Config = {
  templateName: 'A Lastik',
  homePageUrl: '/apps/ecommerce/dashboard',
  settingsCookieName: 'materio-mui-next-demo-1',
  mode: 'light',
  skin: 'bordered',
  semiDark: true,
  layout: 'vertical',
  layoutPadding: 24,
  compactContentWidth: 1440,
  navbar: {
    type: 'fixed',
    contentWidth: 'wide',
    floating: false,
    detached: true,
    blur: true
  },
  contentWidth: 'wide',
  footer: {
    type: 'static',
    contentWidth: 'wide',
    detached: true
  },
  disableRipple: false,
  toastPosition: 'bottom-right'
}

export default themeConfig
