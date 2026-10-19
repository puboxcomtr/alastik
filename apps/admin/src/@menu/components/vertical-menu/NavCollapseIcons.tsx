'use client'

import type { HTMLAttributes, ReactElement } from 'react'

import useVerticalNav from '../../hooks/useVerticalNav'

import CloseIcon from '../../svg/Close'
import RadioCircleIcon from '../../svg/RadioCircle'
import RadioCircleMarkedIcon from '../../svg/RadioCircleMarked'

type NavCollapseIconsProps = HTMLAttributes<HTMLSpanElement> & {
  closeIcon?: ReactElement
  lockedIcon?: ReactElement
  unlockedIcon?: ReactElement
  onClick?: () => void
  onClose?: () => void
}

const NavCollapseIcons = (props: NavCollapseIconsProps) => {
  const { closeIcon, lockedIcon, unlockedIcon, onClick, onClose, ...rest } = props

  const { isCollapsed, collapseVerticalNav, isBreakpointReached, toggleVerticalNav } = useVerticalNav()

  const handleClick = (action: 'lock' | 'unlock') => {
    const collapse = action === 'lock' ? false : true

    collapseVerticalNav(collapse)

    onClick && onClick()
  }

  const handleClose = () => {
    toggleVerticalNav(false)

    onClose && onClose()
  }

  return (
    <>
      {isBreakpointReached ? (
        <span role='button' tabIndex={0} style={{ display: 'flex', cursor: 'pointer' }} onClick={handleClose} {...rest}>
          {closeIcon ?? <CloseIcon />}
        </span>
      ) : isCollapsed ? (
        <span
          role='button'
          tabIndex={0}
          style={{ display: 'flex', cursor: 'pointer' }}
          onClick={() => handleClick('lock')}
          {...rest}
        >
          {unlockedIcon ?? <RadioCircleIcon />}
        </span>
      ) : (
        <span
          role='button'
          tabIndex={0}
          style={{ display: 'flex', cursor: 'pointer' }}
          onClick={() => handleClick('unlock')}
          {...rest}
        >
          {lockedIcon ?? <RadioCircleMarkedIcon />}
        </span>
      )}
    </>
  )
}

export default NavCollapseIcons
