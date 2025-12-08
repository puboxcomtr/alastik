export const i18n = {
  defaultLocale: 'tr',
  locales: ['tr'],
  langDirection: {
    tr: 'ltr'
  }
} as const

export type Locale = (typeof i18n)['locales'][number]
