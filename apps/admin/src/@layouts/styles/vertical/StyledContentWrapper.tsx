'use client'

import styled from '@emotion/styled'

import { commonLayoutClasses, verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const StyledContentWrapper = styled.div`
  &:has(.${verticalLayoutClasses.content}>.${commonLayoutClasses.contentHeightFixed}) {
    max-block-size: 100dvh;
  }
`

export default StyledContentWrapper
