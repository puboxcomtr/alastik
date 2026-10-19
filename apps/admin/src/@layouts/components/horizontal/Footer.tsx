'use client'

import { useTheme } from '@mui/material/styles'

import classnames from 'classnames'
import type { CSSObject } from '@emotion/styled'

import type { ChildrenType } from '@core/types'

import themeConfig from '@configs/themeConfig'

import { useSettings } from '@core/hooks/useSettings'

import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

import StyledFooter from '@layouts/styles/horizontal/StyledFooter'

type Props = ChildrenType & {
  overrideStyles?: CSSObject
}

const Footer = (props: Props) => {
  const { children, overrideStyles } = props

  const { settings } = useSettings()
  const theme = useTheme()

  const { footerContentWidth } = settings

  const footerStatic = themeConfig.footer.type === 'static'
  const footerFixed = themeConfig.footer.type === 'fixed'
  const footerContentCompact = footerContentWidth === 'compact'
  const footerContentWide = footerContentWidth === 'wide'

  return (
    <StyledFooter
      theme={theme}
      overrideStyles={overrideStyles}
      className={classnames(horizontalLayoutClasses.footer, {
        [horizontalLayoutClasses.footerStatic]: footerStatic,
        [horizontalLayoutClasses.footerFixed]: footerFixed,
        [horizontalLayoutClasses.footerContentCompact]: footerContentCompact,
        [horizontalLayoutClasses.footerContentWide]: footerContentWide
      })}
    >
      <div className={horizontalLayoutClasses.footerContentWrapper}>{children}</div>
    </StyledFooter>
  )
}

export default Footer
