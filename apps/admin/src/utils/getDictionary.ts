import 'server-only'

import type { Locale } from '@configs/i18n'

const dictionaries = {
  en: () => import('@/data/dictionaries/en.json').then(module => module.default),
  tr: () => import('@/data/dictionaries/tr.json').then(module => module.default)
}

export const getDictionary = async (locale: Locale) => dictionaries[locale]()
