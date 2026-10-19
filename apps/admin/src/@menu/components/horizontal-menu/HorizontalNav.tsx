'use client'

import { useEffect, useRef } from 'react'
import type { HTMLAttributes } from 'react'

import classnames from 'classnames'
import type { CSSObject } from '@emotion/styled'

import type { BreakpointType, ChildrenType } from '../../types'
import type { VerticalNavProps } from '../vertical-menu/VerticalNav'

import VerticalNavInHorizontal from './VerticalNavInHorizontal'

import useMediaQuery from '../../hooks/useMediaQuery'
import useHorizontalNav from '../../hooks/useHorizontalNav'

import { horizontalNavClasses } from '../../utils/menuClasses'

import StyledHorizontalNav from '../../styles/horizontal/StyledHorizontalNav'

import { defaultBreakpoints } from '../../defaultConfigs'

export type HorizontalNavProps = HTMLAttributes<HTMLDivElement> & {
  switchToVertical?: boolean
  hideMenu?: boolean
  breakpoint?: BreakpointType
  customBreakpoint?: string
  breakpoints?: Partial<typeof defaultBreakpoints>
  customStyles?: CSSObject
  verticalNavProps?: Pick<VerticalNavProps, 'width' | 'backgroundColor' | 'backgroundImage' | 'customStyles'>
  verticalNavContent?: ({ children }: ChildrenType) => JSX.Element

  setIsBreakpointReached?: (isBreakpointReached: boolean) => void
}

const HorizontalNav = (props: HorizontalNavProps) => {
  const {
    switchToVertical = false,
    hideMenu = false,
    breakpoint = 'lg',
    customBreakpoint,
    breakpoints,
    customStyles,
    className,
    children,
    verticalNavProps,
    verticalNavContent: VerticalNavContent
  } = props

  const mergedBreakpoints = { ...defaultBreakpoints, ...breakpoints }
  const horizontalMenuClasses = classnames(horizontalNavClasses.root, className)

  const prevBreakpoint = useRef(false)

  const { updateIsBreakpointReached } = useHorizontalNav()

  const breakpointReached = useMediaQuery(customBreakpoint ?? (breakpoint ? mergedBreakpoints[breakpoint] : breakpoint))

  useEffect(() => {
    if (prevBreakpoint.current === breakpointReached) return
    updateIsBreakpointReached(breakpointReached)
    prevBreakpoint.current = breakpointReached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpointReached])

  if (switchToVertical && breakpointReached) {
    return (
      <VerticalNavInHorizontal
        breakpoint={breakpoint}
        className={horizontalMenuClasses}
        customBreakpoint={customBreakpoint}
        verticalNavProps={verticalNavProps}
      >
        {VerticalNavContent && <VerticalNavContent>{children}</VerticalNavContent>}
      </VerticalNavInHorizontal>
    )
  }

  if (hideMenu && breakpointReached) {
    return null
  }

  return (
    <StyledHorizontalNav customStyles={customStyles} className={horizontalMenuClasses}>
      {children}
    </StyledHorizontalNav>
  )
}

export default HorizontalNav
