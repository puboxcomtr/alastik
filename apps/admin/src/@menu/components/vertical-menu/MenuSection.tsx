'use client'

import { forwardRef } from 'react'
import type { ForwardRefRenderFunction, CSSProperties, ReactElement, ReactNode } from 'react'

import classnames from 'classnames'
import type { CSSObject } from '@emotion/styled'

import type { MenuSectionStyles } from './Menu'
import type { ChildrenType, RootStylesType } from '../../types'

import useVerticalNav from '../../hooks/useVerticalNav'
import useVerticalMenu from '../../hooks/useVerticalMenu'

import { menuClasses } from '../../utils/menuClasses'

import StyledMenuIcon from '../../styles/StyledMenuIcon'
import StyledMenuPrefix from '../../styles/StyledMenuPrefix'
import StyledMenuSuffix from '../../styles/StyledMenuSuffix'
import StyledMenuSectionLabel from '../../styles/StyledMenuSectionLabel'
import StyledVerticalMenuSection from '../../styles/vertical/StyledVerticalMenuSection'

export type MenuSectionProps = Partial<ChildrenType> &
  RootStylesType & {
    label: ReactNode
    icon?: ReactElement
    prefix?: ReactNode
    suffix?: ReactNode

    className?: string
  }

type MenuSectionElement = keyof MenuSectionStyles

const menuSectionWrapperStyles: CSSProperties = {
  display: 'inline-block',
  inlineSize: '100%',
  position: 'relative',
  listStyle: 'none',
  padding: 0,
  overflow: 'hidden'
}

const menuSectionContentStyles: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  inlineSize: '100%',
  position: 'relative',
  paddingBlock: '0.75rem',
  paddingInline: '1.25rem',
  overflow: 'hidden'
}

const MenuSection: ForwardRefRenderFunction<HTMLLIElement, MenuSectionProps> = (props, ref) => {
  const { children, icon, className, prefix, suffix, label, rootStyles, ...rest } = props

  const { isCollapsed, isHovered } = useVerticalNav()
  const { menuSectionStyles, collapsedMenuSectionLabel, textTruncate } = useVerticalMenu()

  const getMenuSectionStyles = (element: MenuSectionElement): CSSObject | undefined => {
    if (menuSectionStyles) {
      return menuSectionStyles[element]
    }
  }

  return (
    // eslint-disable-next-line lines-around-comment
    <StyledVerticalMenuSection
      ref={ref}
      rootStyles={rootStyles}
      menuSectionStyles={getMenuSectionStyles('root')}
      className={classnames(menuClasses.menuSectionRoot, className)}
    >
      <ul className={menuClasses.menuSectionWrapper} {...rest} style={menuSectionWrapperStyles}>
        <li className={menuClasses.menuSectionContent} style={menuSectionContentStyles}>
          {icon && (
            <StyledMenuIcon className={menuClasses.icon} rootStyles={getMenuSectionStyles('icon')}>
              {icon}
            </StyledMenuIcon>
          )}
          {prefix && (
            <StyledMenuPrefix
              isCollapsed={isCollapsed}
              className={menuClasses.prefix}
              rootStyles={getMenuSectionStyles('prefix')}
            >
              {prefix}
            </StyledMenuPrefix>
          )}
          {collapsedMenuSectionLabel && isCollapsed && !isHovered ? (
            <StyledMenuSectionLabel
              isCollapsed={isCollapsed}
              isHovered={isHovered}
              className={menuClasses.menuSectionLabel}
              rootStyles={getMenuSectionStyles('label')}
              textTruncate={textTruncate}
            >
              {collapsedMenuSectionLabel}
            </StyledMenuSectionLabel>
          ) : (
            label && (
              <StyledMenuSectionLabel
                isCollapsed={isCollapsed}
                isHovered={isHovered}
                className={menuClasses.menuSectionLabel}
                rootStyles={getMenuSectionStyles('label')}
                textTruncate={textTruncate}
              >
                {label}
              </StyledMenuSectionLabel>
            )
          )}
          {suffix && (
            <StyledMenuSuffix
              isCollapsed={isCollapsed}
              className={menuClasses.suffix}
              rootStyles={getMenuSectionStyles('suffix')}
            >
              {suffix}
            </StyledMenuSuffix>
          )}
        </li>
        {children}
      </ul>
    </StyledVerticalMenuSection>
  )
}

export default forwardRef<HTMLLIElement, MenuSectionProps>(MenuSection)
