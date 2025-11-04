import { createContext } from 'react'
import type { Locale } from './translations'

export type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (key: string) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
