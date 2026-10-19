'use client'

import classnames from 'classnames'

import type { ChildrenType, SystemMode } from '@core/types'

import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'

import { blankLayoutClasses } from './utils/layoutClasses'

type Props = ChildrenType & {
  systemMode: SystemMode
}

const BlankLayout = (props: Props) => {
  const { children, systemMode } = props

  const { settings } = useSettings()

  useLayoutInit(systemMode)

  return (
    <div className={classnames(blankLayoutClasses.root, 'is-full bs-full')} data-skin={settings.skin}>
      {children}
    </div>
  )
}

export default BlankLayout
