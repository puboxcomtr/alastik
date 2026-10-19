'use client'

import { useEffect, useRef } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { styled, useColorScheme, useTheme } from '@mui/material/styles'

import type { getDictionary } from '@/utils/getDictionary'
import type { Mode } from '@core/types'
import type { Locale } from '@configs/i18n'

import VerticalNav, { NavHeader, NavCollapseIcons } from '@menu/vertical-menu'
import VerticalMenu from './VerticalMenu'
import Logo from '@components/layout/shared/Logo'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

import { getLocalizedUrl } from '@/utils/i18n'

import navigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'

type Props = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  mode: Mode
}

const StyledBoxForShadow = styled('div')(({ theme }) => ({
  top: 60,
  left: -8,
  zIndex: 2,
  opacity: 0,
  position: 'absolute',
  pointerEvents: 'none',
  width: 'calc(100% + 15px)',
  height: theme.mixins.toolbar.minHeight,
  transition: 'opacity .15s ease-in-out',
  background: `linear-gradient(var(--mui-palette-background-default) ${theme.direction === 'rtl' ? '95%' : '5%'
    }, rgb(var(--mui-palette-background-defaultChannel) / 0.85) 30%, rgb(var(--mui-palette-background-defaultChannel) / 0.5) 65%, rgb(var(--mui-palette-background-defaultChannel) / 0.3) 75%, transparent)`,
  '&.scrolled': {
    opacity: 1
  }
}))

const Navigation = (props: Props) => {
  const { dictionary, mode } = props

  const verticalNavOptions = useVerticalNav()
  const { updateSettings, settings } = useSettings()
  const { lang: locale } = useParams()
  const { mode: muiMode, systemMode: muiSystemMode } = useColorScheme()
  const theme = useTheme()

  const shadowRef = useRef(null)

  const { isCollapsed, isHovered, collapseVerticalNav, isBreakpointReached } = verticalNavOptions
  const isSemiDark = settings.semiDark

  const currentMode = muiMode === 'system' ? muiSystemMode : muiMode || mode

  const isDark = currentMode === 'dark'

  const scrollMenu = (container: any, isPerfectScrollbar: boolean) => {
    container = isBreakpointReached || !isPerfectScrollbar ? container.target : container

    if (shadowRef && container.scrollTop > 0) {
      // @ts-ignore
      if (!shadowRef.current.classList.contains('scrolled')) {
        // @ts-ignore
        shadowRef.current.classList.add('scrolled')
      }
    } else {
      // @ts-ignore
      shadowRef.current.classList.remove('scrolled')
    }
  }

  useEffect(() => {
    if (settings.layout === 'collapsed') {
      collapseVerticalNav(true)
    } else {
      collapseVerticalNav(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.layout])

  return (
    // eslint-disable-next-line lines-around-comment
    <VerticalNav
      customStyles={navigationCustomStyles(verticalNavOptions, theme)}
      collapsedWidth={68}
      backgroundColor='var(--mui-palette-background-default)'
      // eslint-disable-next-line lines-around-comment
      {...(isSemiDark &&
        !isDark && {
        'data-dark': ''
      })}
    >
      <StyledBoxForShadow ref={shadowRef} />
      <div style={{ marginTop: '20px', flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <VerticalMenu dictionary={dictionary} scrollMenu={scrollMenu} />
      </div>
    </VerticalNav>
  )
}

export default Navigation
