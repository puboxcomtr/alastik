'use client'

import { forwardRef, useContext, useEffect, useState } from 'react'
import type { AnchorHTMLAttributes, ForwardRefRenderFunction, ReactElement, MouseEvent, ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import classnames from 'classnames'
import { useUpdateEffect } from 'react-use'
import type { CSSObject } from '@emotion/styled'
import { useFloatingTree } from '@floating-ui/react'

import type { ChildrenType, MenuItemElement, MenuItemExactMatchUrlProps, RootStylesType } from '../../types'

import { HorizontalSubMenuContext } from './SubMenu'

import MenuButton from './MenuButton'

import useHorizontalMenu from '../../hooks/useHorizontalMenu'
import useVerticalNav from '../../hooks/useVerticalNav'

import { renderMenuIcon } from '../../utils/menuUtils'
import { menuClasses } from '../../utils/menuClasses'

import StyledMenuLabel from '../../styles/StyledMenuLabel'
import StyledMenuPrefix from '../../styles/StyledMenuPrefix'
import StyledMenuSuffix from '../../styles/StyledMenuSuffix'
import StyledHorizontalMenuItem from '../../styles/horizontal/StyledHorizontalMenuItem'

import styles from '../../styles/horizontal/horizontalUl.module.css'

export type MenuItemProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'prefix'> &
  RootStylesType &
  Partial<ChildrenType> &
  MenuItemExactMatchUrlProps & {
    icon?: ReactElement
    prefix?: ReactNode
    suffix?: ReactNode
    disabled?: boolean
    target?: string
    rel?: string
    component?: string | ReactElement
    onActiveChange?: (active: boolean) => void

    level?: number
  }

const MenuItem: ForwardRefRenderFunction<HTMLLIElement, MenuItemProps> = (props, ref) => {
  const {
    children,
    icon,
    className,
    prefix,
    suffix,
    level = 0,
    disabled = false,
    exactMatch = true,
    activeUrl,
    component,
    onActiveChange,
    rootStyles,
    ...rest
  } = props

  const [active, setActive] = useState(false)

  const tree = useFloatingTree()
  const pathname = usePathname()
  const { toggleVerticalNav, isToggled } = useVerticalNav()
  const { getItemProps } = useContext(HorizontalSubMenuContext)
  const { menuItemStyles, renderExpandedMenuItemIcon, textTruncate } = useHorizontalMenu()

  const getMenuItemStyles = (element: MenuItemElement): CSSObject | undefined => {
    if (menuItemStyles) {
      const params = { level, disabled, active, isSubmenu: false }

      const styleFunction = menuItemStyles[element]

      if (styleFunction) {
        return typeof styleFunction === 'function' ? styleFunction(params) : styleFunction
      }
    }
  }

  const handleClick = () => {
    if (isToggled) {
      toggleVerticalNav()
    }
  }

  useEffect(() => {
    const href = rest.href || (component && typeof component !== 'string' && component.props.href)

    if (href) {
      if (exactMatch ? pathname === href : activeUrl && pathname.includes(activeUrl)) {
        setActive(true)
      } else {
        setActive(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useUpdateEffect(() => {
    onActiveChange?.(active)
  }, [active])

  return (
    <StyledHorizontalMenuItem
      ref={ref}
      className={classnames(
        { [menuClasses.menuItemRoot]: level === 0 },
        { [menuClasses.active]: active },
        { [menuClasses.disabled]: disabled },
        styles.li,
        className
      )}
      level={level}
      disabled={disabled}
      buttonStyles={getMenuItemStyles('button')}
      menuItemStyles={getMenuItemStyles('root')}
      rootStyles={rootStyles}
    >
      <MenuButton
        className={classnames(menuClasses.button, { [menuClasses.active]: active })}
        component={component}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        {...getItemProps({
          onClick(event: MouseEvent<HTMLAnchorElement>) {
            props.onClick?.(event)
            tree?.events.emit('click')
          }
        })}
        {...rest}
      >
        {renderMenuIcon({
          icon,
          level,
          active,
          disabled,
          renderExpandedMenuItemIcon,
          styles: getMenuItemStyles('icon')
        })}

        {prefix && (
          <StyledMenuPrefix
            firstLevel={level === 0}
            className={menuClasses.prefix}
            rootStyles={getMenuItemStyles('prefix')}
          >
            {prefix}
          </StyledMenuPrefix>
        )}

        <StyledMenuLabel
          className={menuClasses.label}
          rootStyles={getMenuItemStyles('label')}
          textTruncate={textTruncate}
        >
          {children}
        </StyledMenuLabel>

        {suffix && (
          <StyledMenuSuffix
            firstLevel={level === 0}
            className={menuClasses.suffix}
            rootStyles={getMenuItemStyles('suffix')}
          >
            {suffix}
          </StyledMenuSuffix>
        )}
      </MenuButton>
    </StyledHorizontalMenuItem>
  )
}

export default forwardRef(MenuItem)
