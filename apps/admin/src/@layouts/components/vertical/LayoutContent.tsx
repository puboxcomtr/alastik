'use client'

import classnames from 'classnames'

import type { ChildrenType } from '@core/types'

import { useSettings } from '@core/hooks/useSettings'

import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

import StyledMain from '@layouts/styles/shared/StyledMain'

const LayoutContent = ({ children }: ChildrenType) => {
  const { settings } = useSettings()

  const contentCompact = settings.contentWidth === 'compact'
  const contentWide = settings.contentWidth === 'wide'

  return (
    <StyledMain
      isContentCompact={contentCompact}
      className={classnames(verticalLayoutClasses.content, 'flex-auto', {
        [`${verticalLayoutClasses.contentCompact} is-full`]: contentCompact,
        [verticalLayoutClasses.contentWide]: contentWide
      })}
    >
      {children}
    </StyledMain>
  )
}

export default LayoutContent
