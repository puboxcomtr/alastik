import { useContext } from 'react'

import type { VerticalMenuContextProps } from '../components/vertical-menu/Menu'

import { VerticalMenuContext } from '../components/vertical-menu/Menu'

const useVerticalMenu = (): VerticalMenuContextProps => {
  const context = useContext(VerticalMenuContext)

  if (context === undefined) {
    throw new Error('Menu Component is required!')
  }

  return context
}

export default useVerticalMenu
