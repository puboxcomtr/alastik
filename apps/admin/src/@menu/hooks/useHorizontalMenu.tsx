import { useContext } from 'react'

import type { HorizontalMenuContextProps } from '../components/horizontal-menu/Menu'

import { HorizontalMenuContext } from '../components/horizontal-menu/Menu'

const useHorizontalMenu = (): HorizontalMenuContextProps => {
  const context = useContext(HorizontalMenuContext)

  if (context === undefined) {
    throw new Error('Menu Component is required!')
  }

  return context
}

export default useHorizontalMenu
