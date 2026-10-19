import { useContext } from 'react'

import HorizontalNavContext from '../contexts/horizontalNavContext'

const useHorizontalNav = () => {
  const context = useContext(HorizontalNavContext)

  if (context === undefined) {
    throw new Error('HorizontalNav Component is required!')
  }

  return context
}

export default useHorizontalNav
