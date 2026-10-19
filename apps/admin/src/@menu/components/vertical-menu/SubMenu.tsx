'use client'

import { Children, cloneElement, forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type {
  AnchorHTMLAttributes,
  ForwardRefRenderFunction,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode
} from 'react'

import { usePathname } from 'next/navigation'

import classnames from 'classnames'
import styled from '@emotion/styled'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useRole,
  useInteractions,
  useClick,
  safePolygon,
  useDismiss,
  hide,
  useFloatingTree,
  FloatingPortal
} from '@floating-ui/react'
import type { CSSObject } from '@emotion/styled'

import type { OpenSubmenu } from './Menu'
import type { MenuItemProps } from './MenuItem'
import type { ChildrenType, RootStylesType, SubMenuItemElement } from '../../types'

import SubMenuContent from './SubMenuContent'
import MenuButton, { menuButtonStyles } from './MenuButton'

import ChevronRight from '../../svg/ChevronRight'

import useVerticalNav from '../../hooks/useVerticalNav'
import useVerticalMenu from '../../hooks/useVerticalMenu'

import { menuClasses } from '../../utils/menuClasses'
import { confirmUrlInChildren, renderMenuIcon } from '../../utils/menuUtils'

import StyledMenuLabel from '../../styles/StyledMenuLabel'
import StyledMenuPrefix from '../../styles/StyledMenuPrefix'
import StyledMenuSuffix from '../../styles/StyledMenuSuffix'
import StyledVerticalNavExpandIcon, {
  StyledVerticalNavExpandIconWrapper
} from '../../styles/vertical/StyledVerticalNavExpandIcon'

export type SubMenuProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'prefix'> &
  RootStylesType &
  Partial<ChildrenType> & {
    label: ReactNode
    icon?: ReactElement
    prefix?: ReactNode
    suffix?: ReactNode
    defaultOpen?: boolean
    disabled?: boolean
    component?: string | ReactElement
    contentClassName?: string
    onOpenChange?: (open: boolean) => void

    level?: number
  }

type StyledSubMenuProps = Pick<SubMenuProps, 'rootStyles' | 'disabled'> & {
  level: number
  active?: boolean
  menuItemStyles?: CSSObject
  isPopoutWhenCollapsed?: boolean
  isCollapsed?: boolean
  buttonStyles?: CSSObject
}

const StyledSubMenu = styled.li<StyledSubMenuProps>`
  position: relative;
  inline-size: 100%;
  margin-block-start: 4px;

  &.${menuClasses.open} > .${menuClasses.button} {
    background-color: #f3f3f3;
  }

  ${({ menuItemStyles }) => menuItemStyles};
  ${({ rootStyles }) => rootStyles};

  > .${menuClasses.button} {
    ${({ level, disabled, active, children, isCollapsed, isPopoutWhenCollapsed }) =>
      menuButtonStyles({
        level,
        active,
        disabled,
        children,
        isCollapsed,
        isPopoutWhenCollapsed
      })};
    ${({ buttonStyles }) => buttonStyles};
  }
`

const SubMenu: ForwardRefRenderFunction<HTMLLIElement, SubMenuProps> = (props, ref) => {
  const {
    children,
    className,
    contentClassName,
    label,
    icon,
    title,
    prefix,
    suffix,
    defaultOpen,
    level = 0,
    disabled = false,
    rootStyles,
    component,
    onOpenChange,
    onClick,
    onKeyUp,
    ...rest
  } = props

  const [openWhenCollapsed, setOpenWhenCollapsed] = useState<boolean>(false)
  const [active, setActive] = useState<boolean>(false)

  const contentRef = useRef<HTMLDivElement>(null)

  const id = useId()
  const pathname = usePathname()
  const { isCollapsed, isPopoutWhenCollapsed, isHovered, isBreakpointReached } = useVerticalNav()
  const tree = useFloatingTree()

  const {
    browserScroll,
    triggerPopout,
    renderExpandIcon,
    renderExpandedMenuItemIcon,
    menuItemStyles,
    openSubmenu,
    toggleOpenSubmenu,
    transitionDuration,
    openSubmenusRef,
    popoutMenuOffset,
    textTruncate
  } = useVerticalMenu()

  const childNodes = Children.toArray(children).filter(Boolean) as [ReactElement<SubMenuProps | MenuItemProps>]

  const mainAxisOffset =
    popoutMenuOffset &&
    popoutMenuOffset.mainAxis &&
    (typeof popoutMenuOffset.mainAxis === 'function' ? popoutMenuOffset.mainAxis({ level }) : popoutMenuOffset.mainAxis)

  const alignmentAxisOffset =
    popoutMenuOffset &&
    popoutMenuOffset.alignmentAxis &&
    (typeof popoutMenuOffset.alignmentAxis === 'function'
      ? popoutMenuOffset.alignmentAxis({ level })
      : popoutMenuOffset.alignmentAxis)

  const { refs, floatingStyles, context } = useFloating({
    strategy: 'fixed',
    open: openWhenCollapsed,
    onOpenChange: setOpenWhenCollapsed,
    placement: 'right-start',
    middleware: [
      offset({
        mainAxis: mainAxisOffset,
        alignmentAxis: alignmentAxisOffset
      }),
      flip({ crossAxis: false }),
      shift(),
      hide()
    ],
    whileElementsMounted: autoUpdate
  })

  const hover = useHover(context, {
    handleClose: safePolygon({
      blockPointerEvents: true
    }),
    restMs: 25,
    enabled: triggerPopout === 'hover',
    delay: { open: 75 }
  })

  const click = useClick(context, {
    enabled: triggerPopout === 'click'
  })

  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'menu' })

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([hover, click, dismiss, role])

  const isSubMenuOpen = openSubmenu?.some((item: OpenSubmenu) => item.id === id) ?? false

  const handleSlideToggle = (): void => {
    if (level === 0 && isCollapsed && !isHovered) {
      return
    }

    toggleOpenSubmenu?.({ level, label, active, id })
    onOpenChange?.(!isSubMenuOpen)
    if (openSubmenusRef?.current && openSubmenusRef?.current.length > 0) openSubmenusRef.current = []
  }

  const handleOnClick = (event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>) => {
    onClick?.(event)
    handleSlideToggle()
  }

  const handleOnKeyUp = (event: KeyboardEvent<HTMLAnchorElement>) => {
    onKeyUp?.(event)

    if (event.key === 'Enter') {
      handleSlideToggle()
    }
  }

  const getSubMenuItemStyles = (element: SubMenuItemElement): CSSObject | undefined => {
    if (menuItemStyles) {
      const params = {
        level,
        disabled,
        active,
        isSubmenu: true,
        open: isSubMenuOpen
      }

      const styleFunction = menuItemStyles[element]

      if (styleFunction) {
        return typeof styleFunction === 'function' ? styleFunction(params) : styleFunction
      }
    }
  }

  useEffect(() => {
    const handleTreeClick = () => {
      setOpenWhenCollapsed(false)
    }

    tree?.events.on('click', handleTreeClick)

    return () => {
      tree?.events.off('click', handleTreeClick)
    }
  }, [tree])

  useLayoutEffect(() => {
    if (isCollapsed && level === 0) {
      setOpenWhenCollapsed(false)
    }
  }, [isCollapsed, level, active])

  useEffect(() => {
    if (confirmUrlInChildren(children, pathname)) {
      openSubmenusRef?.current.push({ level, label, active: true, id })
    } else {
      if (defaultOpen) {
        openSubmenusRef?.current.push({ level, label, active: false, id })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (confirmUrlInChildren(children, pathname)) {
      setActive(true)

      if (openSubmenusRef?.current.findIndex(submenu => submenu.id === id) === -1) {
        openSubmenusRef?.current.push({ level, label, active: true, id })
      }
    } else {
      setActive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const submenuContent = (
    <SubMenuContent
      ref={isCollapsed && level === 0 && isPopoutWhenCollapsed ? refs.setFloating : contentRef}
      {...(isCollapsed && level === 0 && isPopoutWhenCollapsed && getFloatingProps())}
      browserScroll={browserScroll}
      openWhenCollapsed={openWhenCollapsed}
      isPopoutWhenCollapsed={isPopoutWhenCollapsed}
      transitionDuration={transitionDuration}
      open={isSubMenuOpen}
      level={level}
      isCollapsed={isCollapsed}
      isHovered={isHovered}
      className={classnames(menuClasses.subMenuContent, contentClassName)}
      rootStyles={{
        ...(isCollapsed && level === 0 && isPopoutWhenCollapsed && floatingStyles),
        ...getSubMenuItemStyles('subMenuContent')
      }}
    >
      {childNodes.map(node =>
        cloneElement(node, {
          ...getItemProps({
            onClick(event: MouseEvent<HTMLAnchorElement>) {
              if (node.props.children && !Array.isArray(node.props.children)) {
                node.props.onClick?.(event)
                tree?.events.emit('click')
              }
            }
          }),
          level: level + 1
        })
      )}
    </SubMenuContent>
  )

  return (
    // eslint-disable-next-line lines-around-comment
    <StyledSubMenu
      ref={ref}
      className={classnames(
        menuClasses.subMenuRoot,
        { [menuClasses.active]: active },
        { [menuClasses.disabled]: disabled },
        { [menuClasses.open]: isSubMenuOpen },
        className
      )}
      menuItemStyles={getSubMenuItemStyles('root')}
      level={level}
      isPopoutWhenCollapsed={isPopoutWhenCollapsed}
      disabled={disabled}
      active={active}
      isCollapsed={isCollapsed}
      buttonStyles={getSubMenuItemStyles('button')}
      rootStyles={rootStyles}
    >
      <MenuButton
        ref={isCollapsed && level === 0 && isPopoutWhenCollapsed && !disabled ? refs.setReference : null}
        onClick={handleOnClick}
        {...(isCollapsed && level === 0 && isPopoutWhenCollapsed && !disabled && getReferenceProps())}
        onKeyUp={handleOnKeyUp}
        title={title}
        className={classnames(menuClasses.button, { [menuClasses.active]: active })}
        component={component}
        tabIndex={disabled ? -1 : 0}
        {...rest}
      >
        {renderMenuIcon({
          icon,
          level,
          active,
          disabled,
          renderExpandedMenuItemIcon,
          styles: getSubMenuItemStyles('icon'),
          isBreakpointReached
        })}

        {prefix && (
          <StyledMenuPrefix
            isHovered={isHovered}
            isCollapsed={isCollapsed}
            firstLevel={level === 0}
            className={menuClasses.prefix}
            rootStyles={getSubMenuItemStyles('prefix')}
          >
            {prefix}
          </StyledMenuPrefix>
        )}

        <StyledMenuLabel
          className={menuClasses.label}
          rootStyles={getSubMenuItemStyles('label')}
          textTruncate={textTruncate}
        >
          {label}
        </StyledMenuLabel>

        {suffix && (
          <StyledMenuSuffix
            isHovered={isHovered}
            isCollapsed={isCollapsed}
            firstLevel={level === 0}
            className={menuClasses.suffix}
            rootStyles={getSubMenuItemStyles('suffix')}
          >
            {suffix}
          </StyledMenuSuffix>
        )}

        {isCollapsed && !isHovered && level === 0 ? null : (
          <StyledVerticalNavExpandIconWrapper
            className={menuClasses.subMenuExpandIcon}
            rootStyles={getSubMenuItemStyles('subMenuExpandIcon')}
          >
            {renderExpandIcon ? (
              renderExpandIcon({
                level,
                disabled,
                active,
                open: isSubMenuOpen
              })
            ) : (
              // eslint-disable-next-line lines-around-comment
              <StyledVerticalNavExpandIcon open={isSubMenuOpen} transitionDuration={transitionDuration}>
                <ChevronRight fontSize='1rem' />
              </StyledVerticalNavExpandIcon>
            )}
          </StyledVerticalNavExpandIconWrapper>
        )}
      </MenuButton>

      {isCollapsed && level === 0 && isPopoutWhenCollapsed ? (
        <FloatingPortal>{openWhenCollapsed && submenuContent}</FloatingPortal>
      ) : (
        submenuContent
      )}
    </StyledSubMenu>
  )
}

export default forwardRef<HTMLLIElement, SubMenuProps>(SubMenu)
