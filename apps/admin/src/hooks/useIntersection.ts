import { useContext } from 'react'

import { IntersectionContext } from '@/contexts/intersectionContext'

export const useIntersection = () => {
  const context = useContext(IntersectionContext)

  if (!context) {
    throw new Error('useIntersection must be used within a IntersectionProvider')
  }

  return context
}
