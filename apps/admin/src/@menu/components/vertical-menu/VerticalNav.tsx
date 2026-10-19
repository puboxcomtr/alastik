'use client'

import { useEffect, useRef } from 'react'
import type { HTMLAttributes } from 'react'

import classnames from 'classnames'
import type { CSSObject } from '@emotion/styled'

import type { BreakpointType } from '../../types'

import type { VerticalNavState } from '../../contexts/verticalNavContext'

import useMediaQuery from '../../hooks/useMediaQuery'
import useVerticalNav from '../../hooks/useVerticalNav'

import { verticalNavClasses } from '../../utils/menuClasses'

import StyledBackdrop from '../../styles/StyledBackdrop'
import StyledVerticalNav from '../../styles/vertical/StyledVerticalNav'
import StyledVerticalNavContainer from '../../styles/vertical/StyledVerticalNavContainer'
import StyledVerticalNavBgColorContainer from '../../styles/vertical/StyledVerticalNavBgColorContainer'

import styles from '../../styles/vertical/verticalNavBgImage.module.css'

import { defaultBreakpoints, verticalNavToggleDuration } from '../../defaultConfigs'

export type VerticalNavProps = HTMLAttributes<HTMLHtmlElement> & {
  width?: VerticalNavState['width']
  collapsedWidth?: VerticalNavState['collapsedWidth']
  defaultCollapsed?: boolean
  backgroundColor?: string
  backgroundImage?: string
  breakpoint?: BreakpointType
  customBreakpoint?: string
  breakpoints?: Partial<typeof defaultBreakpoints>
  transitionDuration?: VerticalNavState['transitionDuration']
  backdropColor?: string
  scrollWithContent?: boolean
  customStyles?: CSSObject
}

const VerticalNav = (props: VerticalNavProps) => {
  const {
    width = 260,
    collapsedWidth = 80,
    defaultCollapsed = false,
    backgroundColor = 'white',
    backgroundImage,
    breakpoint = 'lg',
    customBreakpoint,
    breakpoints,
    transitionDuration = verticalNavToggleDuration,
    backdropColor,
    scrollWithContent = false,
    className,
    customStyles,
    children,
    ...rest
  } = props

  const mergedBreakpoints = { ...defaultBreakpoints, ...breakpoints }

  const verticalNavCollapsedRef = useRef(false)

  const {
    updateVerticalNavState,
    isCollapsed: isCollapsedContext,
    width: widthContext,
    isBreakpointReached: isBreakpointReachedContext,
    isToggled: isToggledContext,
    isHovered: isHoveredContext,
    collapsing: collapsingContext,
    expanding: expandingContext,
    isScrollWithContent: isScrollWithContentContext,
    transitionDuration: transitionDurationContext,
    isPopoutWhenCollapsed: isPopoutWhenCollapsedContext
  } = useVerticalNav()

  const breakpointReached = useMediaQuery(customBreakpoint ?? (breakpoint ? mergedBreakpoints[breakpoint] : breakpoint))

  useEffect(() => {
    updateVerticalNavState({
      width,
      collapsedWidth,
      transitionDuration,
      isScrollWithContent: scrollWithContent,
      isBreakpointReached: breakpointReached
    })

    if (!breakpointReached) {
      updateVerticalNavState({ isToggled: false })
      verticalNavCollapsedRef.current && updateVerticalNavState({ isCollapsed: true })
    } else {
      if (isCollapsedContext && !verticalNavCollapsedRef.current) {
        verticalNavCollapsedRef.current = true
      }

      isCollapsedContext && updateVerticalNavState({ isCollapsed: false })
      isHoveredContext && updateVerticalNavState({ isHovered: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, collapsedWidth, scrollWithContent, breakpointReached, updateVerticalNavState])

  useEffect(() => {
    if (defaultCollapsed) {
      updateVerticalNavState({
        isCollapsed: defaultCollapsed,
        isToggled: false
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCollapsed])

  useEffect(() => {
    setTimeout(() => {
      updateVerticalNavState({
        expanding: false,
        collapsing: false
      })
    }, transitionDuration)

    if (!isCollapsedContext && !breakpointReached && verticalNavCollapsedRef.current) {
      verticalNavCollapsedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsedContext])

  const handleBackdropClick = () => {
    updateVerticalNavState({ isToggled: false })
  }

  const handleVerticalNavHover = () => {
    if (isCollapsedContext && !isHoveredContext) {
      updateVerticalNavState({ isHovered: true })
    }
  }

  const handleVerticalNavHoverOut = () => {
    if (isCollapsedContext && isHoveredContext) {
      updateVerticalNavState({ isHovered: false })
    }
  }

  return (
    <StyledVerticalNav
      width={defaultCollapsed && !widthContext ? collapsedWidth : width}
      isBreakpointReached={isBreakpointReachedContext}
      collapsedWidth={collapsedWidth}
      collapsing={collapsingContext}
      expanding={expandingContext}
      customStyles={customStyles}
      scrollWithContent={isScrollWithContentContext}
      transitionDuration={transitionDurationContext}
      className={classnames(
        verticalNavClasses.root,
        {
          [verticalNavClasses.collapsed]: isCollapsedContext,
          [verticalNavClasses.toggled]: isToggledContext,
          [verticalNavClasses.hovered]: isHoveredContext,
          [verticalNavClasses.breakpointReached]: isBreakpointReachedContext,
          [verticalNavClasses.scrollWithContent]: isScrollWithContentContext,
          [verticalNavClasses.collapsing]: collapsingContext,
          [verticalNavClasses.expanding]: expandingContext
        },
        className
      )}
      {...rest}
    >
      <StyledVerticalNavContainer
        width={widthContext}
        className={verticalNavClasses.container}
        transitionDuration={transitionDurationContext}
        {
          // eslint-disable-next-line lines-around-comment
          ...(!isPopoutWhenCollapsedContext &&
            isCollapsedContext &&
            !breakpointReached && {
              onMouseEnter: handleVerticalNavHover,
              onMouseLeave: handleVerticalNavHoverOut
            })
        }
      >
        <StyledVerticalNavBgColorContainer
          className={verticalNavClasses.bgColorContainer}
          backgroundColor={backgroundColor}
        >
          {children}
        </StyledVerticalNavBgColorContainer>

        {backgroundImage && (
          // eslint-disable-next-line lines-around-comment
          <img
            className={classnames(verticalNavClasses.image, styles.root)}
            src={backgroundImage}
            alt='verticalNav background'
          />
        )}
      </StyledVerticalNavContainer>

      {isToggledContext && breakpointReached && (
        // eslint-disable-next-line lines-around-comment
        <StyledBackdrop
          role='button'
          tabIndex={0}
          aria-label='backdrop'
          onClick={handleBackdropClick}
          onKeyPress={handleBackdropClick}
          className={verticalNavClasses.backdrop}
          backdropColor={backdropColor}
        />
      )}
    </StyledVerticalNav>
  )
}

export default VerticalNav
