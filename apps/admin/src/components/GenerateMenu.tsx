import type { ReactNode } from 'react'

import { useParams } from 'next/navigation'

import Chip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'

import type { Locale } from '@configs/i18n'
import type {
  VerticalMenuDataType,
  VerticalSectionDataType,
  VerticalSubMenuDataType,
  VerticalMenuItemDataType,
  HorizontalMenuDataType,
  HorizontalSubMenuDataType,
  HorizontalMenuItemDataType
} from '@/types/menuTypes'

import { SubMenu as HorizontalSubMenu, MenuItem as HorizontalMenuItem } from '@menu/horizontal-menu'
import { SubMenu as VerticalSubMenu, MenuItem as VerticalMenuItem, MenuSection } from '@menu/vertical-menu'

import { getLocalizedUrl } from '@/utils/i18n'

export const GenerateVerticalMenu = ({ menuData }: { menuData: VerticalMenuDataType[] }) => {
  const { lang: locale } = useParams()

  const renderMenuItems = (data: VerticalMenuDataType[]) => {
    return data.map((item: VerticalMenuDataType, index) => {
      const menuSectionItem = item as VerticalSectionDataType
      const subMenuItem = item as VerticalSubMenuDataType
      const menuItem = item as VerticalMenuItemDataType

      if (menuSectionItem.isSection) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { children, isSection, ...rest } = menuSectionItem

        return (
          <MenuSection key={index} {...rest}>
            {children && renderMenuItems(children)}
          </MenuSection>
        )
      }

      if (subMenuItem.children) {
        const { children, icon, prefix, suffix, ...rest } = subMenuItem

        const Icon = icon ? <i className={icon} /> : null

        const subMenuPrefix: ReactNode =
          prefix && (prefix as ChipProps).label ? (
            <Chip size='small' {...(prefix as ChipProps)} />
          ) : (
            (prefix as ReactNode)
          )

        const subMenuSuffix: ReactNode =
          suffix && (suffix as ChipProps).label ? (
            <Chip size='small' {...(suffix as ChipProps)} />
          ) : (
            (suffix as ReactNode)
          )

        return (
          <VerticalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
            {children && renderMenuItems(children)}
          </VerticalSubMenu>
        )
      }

      const { label, excludeLang, icon, prefix, suffix, ...rest } = menuItem

      const href = rest.href?.startsWith('http')
        ? rest.href
        : rest.href && (excludeLang ? rest.href : getLocalizedUrl(rest.href, locale as Locale))

      const Icon = icon ? <i className={icon} /> : null

      const menuItemPrefix: ReactNode =
        prefix && (prefix as ChipProps).label ? <Chip size='small' {...(prefix as ChipProps)} /> : (prefix as ReactNode)

      const menuItemSuffix: ReactNode =
        suffix && (suffix as ChipProps).label ? <Chip size='small' {...(suffix as ChipProps)} /> : (suffix as ReactNode)

      return (
        <VerticalMenuItem
          key={index}
          prefix={menuItemPrefix}
          suffix={menuItemSuffix}
          {...rest}
          href={href}
          {...(Icon && { icon: Icon })}
        >
          {label}
        </VerticalMenuItem>
      )
    })
  }

  return <>{renderMenuItems(menuData)}</>
}

export const GenerateHorizontalMenu = ({ menuData }: { menuData: HorizontalMenuDataType[] }) => {
  const { lang: locale } = useParams()

  const renderMenuItems = (data: HorizontalMenuDataType[]) => {
    return data.map((item: HorizontalMenuDataType, index) => {
      const subMenuItem = item as HorizontalSubMenuDataType
      const menuItem = item as HorizontalMenuItemDataType

      if (subMenuItem.children) {
        const { children, icon, prefix, suffix, ...rest } = subMenuItem

        const Icon = icon ? <i className={icon} /> : null

        const subMenuPrefix: ReactNode =
          prefix && (prefix as ChipProps).label ? (
            <Chip size='small' {...(prefix as ChipProps)} />
          ) : (
            (prefix as ReactNode)
          )

        const subMenuSuffix: ReactNode =
          suffix && (suffix as ChipProps).label ? (
            <Chip size='small' {...(suffix as ChipProps)} />
          ) : (
            (suffix as ReactNode)
          )

        return (
          <HorizontalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
            {children && renderMenuItems(children)}
          </HorizontalSubMenu>
        )
      }

      const { label, excludeLang, icon, prefix, suffix, ...rest } = menuItem

      const href = rest.href?.startsWith('http')
        ? rest.href
        : rest.href && (excludeLang ? rest.href : getLocalizedUrl(rest.href, locale as Locale))

      const Icon = icon ? <i className={icon} /> : null

      const menuItemPrefix: ReactNode =
        prefix && (prefix as ChipProps).label ? <Chip size='small' {...(prefix as ChipProps)} /> : (prefix as ReactNode)

      const menuItemSuffix: ReactNode =
        suffix && (suffix as ChipProps).label ? <Chip size='small' {...(suffix as ChipProps)} /> : (suffix as ReactNode)

      return (
        <HorizontalMenuItem
          key={index}
          prefix={menuItemPrefix}
          suffix={menuItemSuffix}
          {...rest}
          href={href}
          {...(Icon && { icon: Icon })}
        >
          {label}
        </HorizontalMenuItem>
      )
    })
  }

  return <>{renderMenuItems(menuData)}</>
}
