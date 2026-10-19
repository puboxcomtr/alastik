'use client'

import { redirect, usePathname } from 'next/navigation'

import { i18n } from '@configs/i18n'

const LangRedirect = () => {
  const pathname = usePathname()

  const redirectUrl = `/${i18n.defaultLocale}${pathname}`

  redirect(redirectUrl)
}

export default LangRedirect
