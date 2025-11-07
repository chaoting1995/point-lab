import { useCallback, useEffect, useMemo, useState } from 'react'
import { LanguageContext, type LanguageContextValue } from './LanguageContext'
import type { Locale } from './translations'
import { translate } from './translations'

const STORAGE_KEY = 'pl:locale'

function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'zh-Hant'
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'zh-Hans' || stored === 'zh-Hant' || stored === 'en') {
    return stored
  }
  const browserLang = window.navigator.language.toLowerCase()
  if (browserLang.startsWith('zh-cn') || browserLang.startsWith('zh-hans')) {
    return 'zh-Hans'
  }
  if (browserLang.startsWith('en')) {
    return 'zh-Hant' // default site copy in Chinese; user can toggle to EN
  }
  return 'zh-Hant'
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale)
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      if (prev === 'zh-Hant') return 'zh-Hans'
      if (prev === 'zh-Hans') return 'en'
      return 'zh-Hant'
    })
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t: (key: string) => translate(locale, key),
    }),
    [locale, setLocale, toggleLocale],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export default LanguageProvider
