import styled from '@emotion/styled'

import type { RootStylesType } from '../../types'

const StyledHorizontalSubMenuContentWrapper = styled.div<RootStylesType>`
  z-index: 10;

  ${({ rootStyles }) => rootStyles};
`

export default StyledHorizontalSubMenuContentWrapper
