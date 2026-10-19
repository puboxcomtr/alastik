'use client'

import classnames from 'classnames'

import type { ChildrenType } from '@core/types'

import themeConfig from '@configs/themeConfig'

import { useSettings } from '@core/hooks/useSettings'

import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

import StyledMain from '@layouts/styles/shared/StyledMain'

const LayoutContent = ({ children }: ChildrenType) => {
  const { settings } = useSettings()

  const contentCompact = settings.contentWidth === 'compact'
  const contentWide = settings.contentWidth === 'wide'

  return (
    <StyledMain
      isContentCompact={contentCompact}
      className={classnames(horizontalLayoutClasses.content, 'flex-auto', {
        [`${horizontalLayoutClasses.contentCompact} is-full`]: contentCompact,
        [horizontalLayoutClasses.contentWide]: contentWide
      })}
      style={{ padding: themeConfig.layoutPadding }}
    >
      {children}
    </StyledMain>
  )
}

export default LayoutContent
