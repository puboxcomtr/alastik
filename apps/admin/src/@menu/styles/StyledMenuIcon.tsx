import styled from '@emotion/styled'

import type { RootStylesType } from '../types'

const StyledMenuIcon = styled.span<RootStylesType>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-inline-end: 10px;
  ${({ rootStyles }) => rootStyles};
`

export default StyledMenuIcon
