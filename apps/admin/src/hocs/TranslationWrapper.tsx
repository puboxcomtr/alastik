import type { headers } from 'next/headers'

import type { Locale } from '@configs/i18n'
import type { ChildrenType } from '@/@core/types'

import LangRedirect from '@components/LangRedirect'

import { i18n } from '@configs/i18n'

const invalidLangs = ['_next']

const TranslationWrapper = (
  props: { headersList: Awaited<ReturnType<typeof headers>>; lang: Locale } & ChildrenType
) => {
  const doesLangExist = i18n.locales.includes(props.lang)

  const isInvalidLang = invalidLangs.includes(props.lang)

  return doesLangExist || isInvalidLang ? props.children : <LangRedirect />
}

export default TranslationWrapper
