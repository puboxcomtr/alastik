import { useContext } from 'react'

import VerticalNavContext from '../contexts/verticalNavContext'

const useVerticalNav = () => {
  const context = useContext(VerticalNavContext)

  if (context === undefined) {
    throw new Error('VerticalNav Component is required!')
  }

  return context
}

export default useVerticalNav
