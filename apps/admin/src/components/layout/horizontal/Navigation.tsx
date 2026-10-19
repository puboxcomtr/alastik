import styled from '@emotion/styled'
import classnames from 'classnames'

import type { getDictionary } from '@/utils/getDictionary'

import HorizontalMenu from './HorizontalMenu'

import themeConfig from '@configs/themeConfig'

import { useSettings } from '@core/hooks/useSettings'
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

type StyledDivProps = {
  isContentCompact: boolean
  isBreakpointReached?: boolean
}

const StyledDiv = styled.div<StyledDivProps>`
  ${({ isContentCompact, isBreakpointReached }) =>
    !isBreakpointReached &&
    `
    padding: ${themeConfig.layoutPadding}px;

    ${
      isContentCompact &&
      `
      margin-inline: auto;
      max-inline-size: ${themeConfig.compactContentWidth}px;
    `
    }
  `}
`

const Navigation = ({ dictionary }: { dictionary: Awaited<ReturnType<typeof getDictionary>> }) => {
  const { settings } = useSettings()
  const { isBreakpointReached } = useHorizontalNav()

  const headerContentCompact = settings.navbarContentWidth === 'compact'

  return (
    <div
      {...(!isBreakpointReached && {
        className: classnames(horizontalLayoutClasses.navigation, 'relative flex border-bs')
      })}
    >
      <StyledDiv
        isContentCompact={headerContentCompact}
        isBreakpointReached={isBreakpointReached}
        {...(!isBreakpointReached && {
          className: classnames(horizontalLayoutClasses.navigationContentWrapper, 'flex items-center is-full plb-2.5')
        })}
      >
        <HorizontalMenu dictionary={dictionary} />
      </StyledDiv>
    </div>
  )
}

export default Navigation
