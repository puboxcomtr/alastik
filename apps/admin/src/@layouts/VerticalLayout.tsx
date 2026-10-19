import type { ReactNode } from 'react'

import classnames from 'classnames'

import type { ChildrenType } from '@core/types'

import LayoutContent from './components/vertical/LayoutContent'

import { verticalLayoutClasses } from './utils/layoutClasses'

import StyledContentWrapper from './styles/vertical/StyledContentWrapper'

type VerticalLayoutProps = ChildrenType & {
  navigation?: ReactNode
  navbar?: ReactNode
  footer?: ReactNode
}

const VerticalLayout = (props: VerticalLayoutProps) => {
  const { navbar, footer, navigation, children } = props

  return (
    <div className={classnames(verticalLayoutClasses.root, 'flex flex-auto')}>
      {navigation || null}
      <StyledContentWrapper
        className={classnames(verticalLayoutClasses.contentWrapper, 'flex flex-col min-is-0 is-full')}
      >
        {navbar || null}
        <LayoutContent>{children}</LayoutContent>
        {footer || null}
      </StyledContentWrapper>
    </div>
  )
}

export default VerticalLayout
