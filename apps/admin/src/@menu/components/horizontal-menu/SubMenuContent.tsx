import { forwardRef } from 'react'
import type { ForwardRefRenderFunction, HTMLAttributes } from 'react'

import PerfectScrollbar from 'react-perfect-scrollbar'

import type { ChildrenType, RootStylesType } from '../../types'

import StyledHorizontalSubMenuContent from '../../styles/horizontal/StyledHorizontalSubMenuContent'

import styles from '../../styles/styles.module.css'

export type SubMenuContentProps = HTMLAttributes<HTMLDivElement> &
  RootStylesType &
  Partial<ChildrenType> & {
    open?: boolean
    browserScroll?: boolean
    firstLevel?: boolean
    top?: number
  }

const SubMenuContent: ForwardRefRenderFunction<HTMLDivElement, SubMenuContentProps> = (props, ref) => {
  const { children, open, firstLevel, top, browserScroll, ...rest } = props

  return (
    <StyledHorizontalSubMenuContent
      ref={ref}
      firstLevel={firstLevel}
      open={open}
      top={top}
      browserScroll={browserScroll}
      {...rest}
    >
      {!browserScroll ? (
        <PerfectScrollbar
          options={{ wheelPropagation: false, suppressScrollX: true }}
          style={{ maxBlockSize: `calc((var(--vh, 1vh) * 100) - ${top}px)` }}
        >
          <ul className={styles.ul}>{children}</ul>
        </PerfectScrollbar>
      ) : (
        <ul className={styles.ul}>{children}</ul>
      )}
    </StyledHorizontalSubMenuContent>
  )
}

export default forwardRef(SubMenuContent)
