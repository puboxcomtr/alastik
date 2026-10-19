'use client'

import type { ReactElement } from 'react'

import type { SystemMode } from '@core/types'

import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'

type LayoutWrapperProps = {
  systemMode: SystemMode
  verticalLayout: ReactElement
  horizontalLayout: ReactElement
}

const LayoutWrapper = (props: LayoutWrapperProps) => {
  const { systemMode, verticalLayout, horizontalLayout } = props

  const { settings } = useSettings()

  useLayoutInit(systemMode)

  return (
    <div className='flex flex-col flex-auto' data-skin={settings.skin}>
      {settings.layout === 'horizontal' ? horizontalLayout : verticalLayout}
    </div>
  )
}

export default LayoutWrapper
