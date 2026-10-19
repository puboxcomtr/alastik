import type { ChildrenType } from '@/@core/types'
import type { Locale } from '@configs/i18n'

import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'

import { i18n } from '@configs/i18n'

import { getSystemMode } from '@/@core/utils/serverHelpers'

type Props = ChildrenType & {
  params: Promise<{ lang: Locale }>
}

const Layout = async (props: Props) => {
  const params = await props.params
  const { children } = props

  const direction = i18n.langDirection[params.lang]
  const systemMode = await getSystemMode()

  return (
    <Providers direction={direction}>
      <BlankLayout systemMode={systemMode}>{children}</BlankLayout>
    </Providers>
  )
}

export default Layout
