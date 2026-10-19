import type { ReactNode } from 'react'

import classnames from 'classnames'

import type { ChildrenType } from '@core/types'

import { HorizontalNavProvider } from '@menu/contexts/horizontalNavContext'

import LayoutContent from './components/horizontal/LayoutContent'

import { horizontalLayoutClasses } from './utils/layoutClasses'

import StyledContentWrapper from './styles/horizontal/StyledContentWrapper'

type HorizontalLayoutProps = ChildrenType & {
  header?: ReactNode
  footer?: ReactNode
}

const HorizontalLayout = (props: HorizontalLayoutProps) => {
  const { header, footer, children } = props

  return (
    <div className={classnames(horizontalLayoutClasses.root, 'flex flex-auto')}>
      <HorizontalNavProvider>
        <StyledContentWrapper className={classnames(horizontalLayoutClasses.contentWrapper, 'flex flex-col is-full')}>
          {header || null}
          <LayoutContent>{children}</LayoutContent>
          {footer || null}
        </StyledContentWrapper>
      </HorizontalNavProvider>
    </div>
  )
}

export default HorizontalLayout
