'use client'

import { createContext, useMemo, useState } from 'react'

import type { ChildrenType } from '../types'

export type HorizontalNavContextProps = {
  isBreakpointReached?: boolean
  updateIsBreakpointReached: (isBreakpointReached: boolean) => void
}

const HorizontalNavContext = createContext({} as HorizontalNavContextProps)

export const HorizontalNavProvider = ({ children }: ChildrenType) => {
  const [isBreakpointReached, setIsBreakpointReached] = useState(false)

  const updateIsBreakpointReached = (isBreakpointReached: boolean) => {
    setIsBreakpointReached(isBreakpointReached)
  }

  const HorizontalNavProviderValue = useMemo(
    () => ({
      isBreakpointReached,
      updateIsBreakpointReached
    }),
    [isBreakpointReached]
  )

  return <HorizontalNavContext.Provider value={HorizontalNavProviderValue}>{children}</HorizontalNavContext.Provider>
}

export default HorizontalNavContext
