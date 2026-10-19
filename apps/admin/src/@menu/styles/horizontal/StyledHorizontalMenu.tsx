import styled from '@emotion/styled'

import type { MenuProps } from '../../components/vertical-menu/Menu'

import { menuClasses } from '../../utils/menuClasses'

const StyledHorizontalMenu = styled.nav<Pick<MenuProps, 'rootStyles'>>`
  &.${menuClasses.root} {
    ${({ rootStyles }) => rootStyles}
  }
`

export default StyledHorizontalMenu
