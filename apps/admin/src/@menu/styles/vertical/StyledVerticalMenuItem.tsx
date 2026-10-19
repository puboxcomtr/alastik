import styled from '@emotion/styled'
import type { CSSObject } from '@emotion/styled'

import type { MenuItemProps } from '../../components/vertical-menu/MenuItem'

import { menuClasses } from '../../utils/menuClasses'

import { menuButtonStyles } from '../../components/vertical-menu/MenuButton'

type StyledVerticalMenuItemProps = Pick<MenuItemProps, 'rootStyles' | 'disabled'> & {
  level: number
  menuItemStyles?: CSSObject
  isCollapsed?: boolean
  isPopoutWhenCollapsed?: boolean
  buttonStyles?: CSSObject
}

const StyledVerticalMenuItem = styled.li<StyledVerticalMenuItemProps>`
  position: relative;
  margin-block-start: 4px;
  ${({ menuItemStyles }) => menuItemStyles};
  ${({ rootStyles }) => rootStyles};

  > .${menuClasses.button} {
    ${({ level, disabled, isCollapsed, isPopoutWhenCollapsed }) =>
      menuButtonStyles({
        level,
        disabled,
        isCollapsed,
        isPopoutWhenCollapsed
      })};
    ${({ buttonStyles }) => buttonStyles};
  }
`

export default StyledVerticalMenuItem
