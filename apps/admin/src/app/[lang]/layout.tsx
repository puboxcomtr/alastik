import { headers } from 'next/headers'

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

import 'react-perfect-scrollbar/dist/css/styles.css'

import type { ChildrenType } from '@/@core/types'
import type { Locale } from '@configs/i18n'

import TranslationWrapper from '@/hocs/TranslationWrapper'

import { i18n } from '@configs/i18n'

import { getSystemMode } from '@/@core/utils/serverHelpers'

import SiteDocumentTitle from '@components/layout/shared/SiteDocumentTitle'

import '@/app/globals.css'

import '@assets/iconify-icons/generated-icons.css'

export const metadata = {
  
  title: 'Yönetici Paneli - ALastik.com',
  description: 'Yönetici Paneli - ALastik.com',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
}

const RootLayout = async (props: ChildrenType & { params: Promise<{ lang: Locale }> }) => {
  const params = await props.params

  const { children } = props

  const headersList = await headers()
  const systemMode = await getSystemMode()
  const direction = i18n.langDirection[params.lang]

  return (
    <TranslationWrapper headersList={headersList} lang={params.lang}>
      <html id='__next' lang={params.lang} dir={direction} suppressHydrationWarning>
        <body className='flex is-full min-bs-full flex-auto flex-col'>
          <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
          <SiteDocumentTitle />
          {children}

        </body>
      </html>
    </TranslationWrapper>
  )
}

export default RootLayout
