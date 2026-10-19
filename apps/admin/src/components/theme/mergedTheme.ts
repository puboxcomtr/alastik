
import { deepmerge } from '@mui/utils'
import type { Theme } from '@mui/material/styles'

import type { Settings } from '@core/contexts/settingsContext'
import type { SystemMode } from '@core/types'

import coreTheme from '@core/theme'

const mergedTheme = (settings: Settings, mode: SystemMode, direction: Theme['direction']) => {
  const userTheme = {
  } as Theme

  return deepmerge(coreTheme(settings, mode, direction), userTheme)
}

export default mergedTheme
