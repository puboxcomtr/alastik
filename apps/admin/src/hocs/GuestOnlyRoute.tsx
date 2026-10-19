import { redirect } from 'next/navigation'

import { getServerSession } from 'next-auth'

import type { ChildrenType } from '@/@core/types'
import type { Locale } from '@configs/i18n'

import themeConfig from '@configs/themeConfig'

import { getLocalizedUrl } from '@/utils/i18n'

const GuestOnlyRoute = async ({ children, lang }: ChildrenType & { lang: Locale }) => {
  const session = await getServerSession()

  if (session) {
    redirect(getLocalizedUrl(themeConfig.homePageUrl, lang))
  }

  return <>{children}</>
}

export default GuestOnlyRoute
