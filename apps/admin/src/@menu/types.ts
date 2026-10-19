import type { AnchorHTMLAttributes, ReactElement, ReactNode } from 'react'

import type { CSSObject } from '@emotion/styled'

export type ChildrenType = {
  children: ReactNode
}

export type BreakpointType = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'always'

export type MenuItemExactMatchUrlProps =
  | {
      exactMatch: true
      activeUrl?: never
    }
  | {
      exactMatch: false
      activeUrl: string
    }
  | {
      exactMatch?: never
      activeUrl?: never
    }

export type MenuItemElement = 'root' | 'button' | 'icon' | 'label' | 'prefix' | 'suffix'

export type SubMenuItemElement =
  | 'root'
  | 'button'
  | 'label'
  | 'prefix'
  | 'suffix'
  | 'icon'
  | 'subMenuStyles'
  | 'subMenuContent'
  | 'subMenuExpandIcon'

export type MenuButtonProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'prefix'> &
  Partial<ChildrenType> & {
    component?: string | ReactElement
  }

export type MenuItemStylesParams = {
  level: number
  disabled: boolean
  active?: boolean
  isSubmenu: boolean
  open?: boolean
}

export type ElementStyles = CSSObject | ((params: MenuItemStylesParams) => CSSObject | undefined)

export type MenuItemStyles = {
  root?: ElementStyles
  button?: ElementStyles
  label?: ElementStyles
  prefix?: ElementStyles
  suffix?: ElementStyles
  icon?: ElementStyles
  subMenuStyles?: ElementStyles
  subMenuContent?: ElementStyles
  subMenuExpandIcon?: ElementStyles
}

export type RenderExpandIconParams = {
  open: boolean
  level: number
  active: boolean
  disabled: boolean
}

export type RenderExpandedMenuItemIcon = {
  icon:
    | ReactElement
    | ((params: { level?: number; active?: boolean; disabled?: boolean }) => ReactElement | null)
    | null
  level?: number
}

export type RootStylesType = {
  rootStyles?: CSSObject
}
