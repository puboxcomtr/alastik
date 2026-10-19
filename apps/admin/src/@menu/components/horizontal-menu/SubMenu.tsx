'use client'

import { Children, cloneElement, createContext, forwardRef, useEffect, useRef, useState } from 'react'
import type {
  AnchorHTMLAttributes,
  ForwardRefRenderFunction,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  HTMLProps,
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
  useFloatingNodeId,
  FloatingNode,
  FloatingPortal,
  useMergeRefs,
  useFloatingParentNodeId,
  useFloatingTree,
  useTransitionStyles
} from '@floating-ui/react'
import type { CSSObject } from '@emotion/styled'

import type { ChildrenType, RootStylesType, SubMenuItemElement } from '../../types'
import type { MenuItemProps } from './MenuItem'

import SubMenuContent from './SubMenuContent'

import useHorizontalMenu from '../../hooks/useHorizontalMenu'

import { menuClasses } from '../../utils/menuClasses'
import { confirmUrlInChildren, renderMenuIcon } from '../../utils/menuUtils'

import MenuButton, { menuButtonStyles } from './MenuButton'
import StyledMenuLabel from '../../styles/StyledMenuLabel'
import StyledMenuPrefix from '../../styles/StyledMenuPrefix'
import StyledMenuSuffix from '../../styles/StyledMenuSuffix'
import StyledHorizontalNavExpandIcon, {
  StyledHorizontalNavExpandIconWrapper
} from '../../styles/horizontal/StyledHorizontalNavExpandIcon'
import StyledSubMenuContentWrapper from '../../styles/horizontal/StyledHorizontalSubMenuContentWrapper'

import ulStyles from '../../styles/horizontal/horizontalUl.module.css'

import ChevronRight from '../../svg/ChevronRight'

export type SubMenuProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'prefix'> &
  RootStylesType &
  Partial<ChildrenType> & {
    label: ReactNode
    icon?: ReactElement
    prefix?: ReactNode
    suffix?: ReactNode
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
  buttonStyles?: CSSObject
}

type HorizontalSubMenuContextProps = {
  getItemProps: (userProps?: HTMLProps<HTMLElement>) => Record<string, unknown>
}

const StyledSubMenu = styled.li<StyledSubMenuProps>`
  ${({ level }) => level === 0 && { borderRadius: '6px', overflow: 'hidden' }}

  &.${menuClasses.open} > .${menuClasses.button} {
    background-color: #f3f3f3;
  }

  ${({ menuItemStyles }) => menuItemStyles};
  ${({ rootStyles }) => rootStyles};

  > .${menuClasses.button} {
    ${({ level, disabled, children }) =>
      menuButtonStyles({
        level,
        disabled,
        children
      })};
    ${({ buttonStyles }) => buttonStyles};
  }
`

export const HorizontalSubMenuContext = createContext<HorizontalSubMenuContextProps>({ getItemProps: () => ({}) })

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
    level = 0,
    disabled = false,
    rootStyles,
    component,
    onClick,
    onKeyUp,
    onOpenChange,
    ...rest
  } = props

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(false)

  const dir = useRef('ltr')
  const listItemsRef = useRef<Array<HTMLButtonElement | null>>([])

  const pathname = usePathname()
  const tree = useFloatingTree()
  const nodeId = useFloatingNodeId()
  const parentId = useFloatingParentNodeId()

  const {
    triggerPopout,
    renderExpandIcon,
    menuItemStyles,
    browserScroll,
    transitionDuration,
    renderExpandedMenuItemIcon,
    popoutMenuOffset,
    textTruncate
  } = useHorizontalMenu()

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

  useEffect(() => {
    dir.current = window.getComputedStyle(document.documentElement).getPropertyValue('direction')
  }, [])

  const { y, refs, floatingStyles, context } = useFloating({
    open,
    nodeId,
    onOpenChange: setOpen,
    placement: level > 0 ? (dir.current !== 'rtl' ? 'right-start' : 'left-start') : 'bottom-start',
    middleware: [
      offset({
        mainAxis: mainAxisOffset,
        alignmentAxis: alignmentAxisOffset
      }),
      flip({ crossAxis: false }),
      shift()
    ],
    whileElementsMounted: autoUpdate
  })

  const { isMounted, styles } = useTransitionStyles(context, {
    duration: transitionDuration,

    initial: {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    open: {
      opacity: 1,
      transform: 'translateY(0px)'
    },
    close: {
      opacity: 0,
      transform: 'translateY(10px)'
    }
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
    enabled: triggerPopout === 'click',
    toggle: false
  })

  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'menu' })

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([hover, click, dismiss, role])

  const handleOnClick = (event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>) => {
    onClick?.(event)
    triggerPopout === 'click' && setOpen(!open)
  }

  const handleOnKeyUp = (event: KeyboardEvent<HTMLAnchorElement>) => {
    onKeyUp?.(event)

    if (event.key === 'Enter') {
      setOpen(!open)
    }
  }

  const getSubMenuItemStyles = (element: SubMenuItemElement): CSSObject | undefined => {
    if (menuItemStyles) {
      const params = { level, disabled, active, isSubmenu: true, open: open }

      const styleFunction = menuItemStyles[element]

      if (styleFunction) {
        return typeof styleFunction === 'function' ? styleFunction(params) : styleFunction
      }
    }
  }

  useEffect(() => {
    const handleTreeClick = () => {
      setOpen(false)
    }

    const onSubMenuOpen = (event: { nodeId: string; parentId: string }) => {
      if (event.nodeId !== nodeId && event.parentId === parentId) {
        setOpen(false)
      }
    }

    tree?.events.on('click', handleTreeClick)
    tree?.events.on('menuopen', onSubMenuOpen)

    return () => {
      tree?.events.off('click', handleTreeClick)
      tree?.events.off('menuopen', onSubMenuOpen)
    }
  }, [tree, nodeId, parentId])

  useEffect(() => {
    if (open) {
      tree?.events.emit('menuopen', {
        parentId,
        nodeId
      })
    }
  }, [tree, open, nodeId, parentId])

  useEffect(() => {
    if (confirmUrlInChildren(children, pathname)) {
      setActive(true)
    } else {
      setActive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    onOpenChange?.(open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const referenceRef = useMergeRefs([refs.setReference, ref])

  return (
    <FloatingNode id={nodeId}>
      <StyledSubMenu
        {...(!disabled && { ref: referenceRef, ...getReferenceProps() })}
        className={classnames(
          { [menuClasses.subMenuRoot]: level === 0 },
          { [menuClasses.active]: active },
          { [menuClasses.disabled]: disabled },
          { [menuClasses.open]: open },
          ulStyles.li,
          className
        )}
        menuItemStyles={getSubMenuItemStyles('root')}
        level={level}
        disabled={disabled}
        active={active}
        buttonStyles={getSubMenuItemStyles('button')}
        rootStyles={rootStyles}
      >
        <MenuButton
          title={title}
          className={classnames(menuClasses.button, { [menuClasses.active]: active })}
          component={component}
          onClick={handleOnClick}
          onKeyUp={handleOnKeyUp}
          {...rest}
        >
          {renderMenuIcon({
            icon,
            level,
            active,
            disabled,
            renderExpandedMenuItemIcon,
            styles: getSubMenuItemStyles('icon')
          })}

          {prefix && (
            <StyledMenuPrefix
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
              firstLevel={level === 0}
              className={menuClasses.suffix}
              rootStyles={getSubMenuItemStyles('suffix')}
            >
              {suffix}
            </StyledMenuSuffix>
          )}

          <StyledHorizontalNavExpandIconWrapper
            className={menuClasses.subMenuExpandIcon}
            rootStyles={getSubMenuItemStyles('subMenuExpandIcon')}
          >
            {renderExpandIcon ? (
              renderExpandIcon({
                level,
                disabled,
                active,
                open: open
              })
            ) : (
              // eslint-disable-next-line lines-around-comment
              <StyledHorizontalNavExpandIcon level={level}>
                <ChevronRight fontSize='1rem' />
              </StyledHorizontalNavExpandIcon>
            )}
          </StyledHorizontalNavExpandIconWrapper>
        </MenuButton>

        <HorizontalSubMenuContext.Provider value={{ getItemProps }}>
          <FloatingPortal>
            {isMounted && (
              <StyledSubMenuContentWrapper
                ref={refs.setFloating}
                {...getFloatingProps()}
                style={floatingStyles}
                rootStyles={getSubMenuItemStyles('subMenuStyles')}
              >
                <SubMenuContent
                  open={open}
                  top={y ? y - window.scrollY : 0}
                  firstLevel={level === 0}
                  browserScroll={browserScroll}
                  className={classnames(menuClasses.subMenuContent, contentClassName)}
                  rootStyles={getSubMenuItemStyles('subMenuContent')}
                  style={{ ...styles }}
                >
                  {childNodes.map((node, index) =>
                    cloneElement(node, {
                      ...getItemProps({
                        ref(node: HTMLButtonElement) {
                          listItemsRef.current[index] = node
                        },
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
              </StyledSubMenuContentWrapper>
            )}
          </FloatingPortal>
        </HorizontalSubMenuContext.Provider>
      </StyledSubMenu>
    </FloatingNode>
  )
}

export default forwardRef<HTMLLIElement, SubMenuProps>(SubMenu)
