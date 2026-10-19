import { useTheme } from '@mui/material/styles'

import classnames from 'classnames'
import type { CSSObject } from '@emotion/styled'

import type { ChildrenType } from '@core/types'

import themeConfig from '@configs/themeConfig'

import { useSettings } from '@core/hooks/useSettings'

import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

import StyledHeader from '@layouts/styles/horizontal/StyledHeader'

type Props = ChildrenType & {
  overrideStyles?: CSSObject
}

const Header = (props: Props) => {
  const { children, overrideStyles } = props

  const { settings } = useSettings()
  const theme = useTheme()

  const { navbarContentWidth } = settings

  const headerFixed = themeConfig.navbar.type === 'fixed'
  const headerStatic = themeConfig.navbar.type === 'static'
  const headerBlur = themeConfig.navbar.blur === true
  const headerContentCompact = navbarContentWidth === 'compact'
  const headerContentWide = navbarContentWidth === 'wide'

  return (
    <StyledHeader
      theme={theme}
      overrideStyles={overrideStyles}
      className={classnames(horizontalLayoutClasses.header, {
        [horizontalLayoutClasses.headerFixed]: headerFixed,
        [horizontalLayoutClasses.headerStatic]: headerStatic,
        [horizontalLayoutClasses.headerBlur]: headerBlur,
        [horizontalLayoutClasses.headerContentCompact]: headerContentCompact,
        [horizontalLayoutClasses.headerContentWide]: headerContentWide
      })}
    >
      {children}
    </StyledHeader>
  )
}

export default Header
