'use client'

import { useEffect } from 'react'

import { useCookie, useMedia } from 'react-use'

import { useColorScheme } from '@mui/material'

import { useSettings } from '@core/hooks/useSettings'

const useLayoutInit = (colorSchemeFallback: 'light' | 'dark') => {
  const { settings } = useSettings()
  const { setMode } = useColorScheme()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, updateCookieColorPref] = useCookie('colorPref')
  const isDark = useMedia('(prefers-color-scheme: dark)', colorSchemeFallback === 'dark')

  useEffect(() => {
    const appMode = isDark ? 'dark' : 'light'

    updateCookieColorPref(appMode)

    if (settings.mode === 'system') {
      setMode(appMode)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark])

}

export default useLayoutInit
