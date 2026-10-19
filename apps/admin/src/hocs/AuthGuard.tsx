import { getServerSession } from 'next-auth'

import type { Locale } from '@configs/i18n'
import type { ChildrenType } from '@/@core/types'

import AuthRedirect from '@/components/AuthRedirect'

export default async function AuthGuard({ children, locale }: ChildrenType & { locale: Locale }) {
  const session = await getServerSession()

  return <>{session ? children : <AuthRedirect lang={locale} />}</>
}
