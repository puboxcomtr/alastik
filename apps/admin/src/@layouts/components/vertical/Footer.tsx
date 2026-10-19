'use client'

import { useTheme } from '@mui/material/styles'

import classnames from 'classnames'
import type { CSSObject } from '@emotion/styled'

import type { ChildrenType } from '@core/types'

import themeConfig from '@configs/themeConfig'

import { useSettings } from '@core/hooks/useSettings'

import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

import StyledFooter from '@layouts/styles/vertical/StyledFooter'

type Props = ChildrenType & {
  overrideStyles?: CSSObject
}

const Footer = (props: Props) => {
  const { children, overrideStyles } = props

  const { settings } = useSettings()
  const theme = useTheme()

  const { footerContentWidth } = settings

  const footerDetached = themeConfig.footer.detached === true
  const footerAttached = themeConfig.footer.detached === false
  const footerStatic = themeConfig.footer.type === 'static'
  const footerFixed = themeConfig.footer.type === 'fixed'
  const footerContentCompact = footerContentWidth === 'compact'
  const footerContentWide = footerContentWidth === 'wide'

  return (
    <StyledFooter
      theme={theme}
      overrideStyles={overrideStyles}
      className={classnames(verticalLayoutClasses.footer, 'is-full', {
        [verticalLayoutClasses.footerDetached]: footerDetached,
        [verticalLayoutClasses.footerAttached]: footerAttached,
        [verticalLayoutClasses.footerStatic]: footerStatic,
        [verticalLayoutClasses.footerFixed]: footerFixed,
        [verticalLayoutClasses.footerContentCompact]: footerContentCompact,
        [verticalLayoutClasses.footerContentWide]: footerContentWide
      })}
    >
      <div className={verticalLayoutClasses.footerContentWrapper}>{children}</div>
    </StyledFooter>
  )
}

export default Footer
