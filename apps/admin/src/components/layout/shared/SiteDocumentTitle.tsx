'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getAdminDocumentTitle } from '@/utils/activeSite'

/**
 * Sekme basligini header'daki aktif siteye gore ayarlar: "Yönetici Paneli - ALastik.com" /
 * "Yönetici Paneli - LastikJantAVM". Site degisimi sayfayi yeniden yuklediginden mount'ta
 * okumak yeterli; Next sayfa gecislerinde metadata basligini geri yazdigi icin pathname'e
 * bagli olarak ve <title> degisimini izleyerek tekrar uygulanir.
 */
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
