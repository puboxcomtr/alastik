'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import styled from '@emotion/styled'

import type { VerticalNavContextProps } from '@menu/contexts/verticalNavContext'

import themeConfig from '@configs/themeConfig'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

import { getThemeSettings, getImageUrl } from '@/libs/api'

type LogoTextProps = {
  isHovered?: VerticalNavContextProps['isHovered']
  isCollapsed?: VerticalNavContextProps['isCollapsed']
  transitionDuration?: VerticalNavContextProps['transitionDuration']
  isBreakpointReached?: VerticalNavContextProps['isBreakpointReached']
  color?: CSSProperties['color']
}

const LogoText = styled.span<LogoTextProps>`
  color: ${({ color }) => color ?? 'var(--mui-palette-text-primary)'};
  font-size: 1.25rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.15px;
  text-transform: uppercase;
  transition: ${({ transitionDuration }) =>
    `margin-inline-start ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`};

  ${({ isHovered, isCollapsed, isBreakpointReached }) =>
    !isBreakpointReached && isCollapsed && !isHovered
      ? 'opacity: 0; margin-inline-start: 0;'
      : 'opacity: 1; margin-inline-start: 10px;'}
`

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  const logoTextRef = useRef<HTMLSpanElement>(null)
  const [logoUrl, setLogoUrl] = useState<string>('')

  const { isHovered, transitionDuration, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()

  const { layout } = settings

  useEffect(() => {
    getThemeSettings().then(response => {
      if (response?.data?.logo) {
        setLogoUrl(getImageUrl(response.data.logo))
      }
    })
  }, [])

  useEffect(() => {
    if (layout !== 'collapsed') {
      return
    }

    if (logoTextRef && logoTextRef.current) {
      if (!isBreakpointReached && layout === 'collapsed' && !isHovered) {
        logoTextRef.current?.classList.add('hidden')
      } else {
        logoTextRef.current.classList.remove('hidden')
      }
    }
  }, [isHovered, layout, isBreakpointReached])

  return (
    <div className='flex items-center min-bs-[24px]'>
      <img
        src={logoUrl}
        alt={themeConfig.templateName}
        style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
      />
    </div>
  )
}

export default Logo