'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getAdminDocumentTitle } from '@/utils/activeSite'

const SiteDocumentTitle = () => {
  const pathname = usePathname()

  useEffect(() => {
    const apply = () => {
      const expected = getAdminDocumentTitle()
      if (document.title !== expected) document.title = expected
    }
    apply()

    const titleEl = document.querySelector('head > title')
    if (!titleEl) return
    const observer = new MutationObserver(apply)
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname])

  return null
}

export default SiteDocumentTitle
