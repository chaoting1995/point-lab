import { Converter } from 'opencc-js'
import zhHantData from './locales/zh-Hant.json'
import enData from './locales/en.json'

export type Locale = 'zh-Hant' | 'zh-Hans' | 'en'
export type AppTranslations = typeof zhHantData

const twToCn = Converter({ from: 'tw', to: 'cn' })
const baseZhHant = zhHantData as AppTranslations
const baseEn = enData as AppTranslations

function convertToSimplified<T>(value: T): T {
  if (typeof value === 'string') {
    return twToCn(value) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertToSimplified(item)) as T
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, nested]) => [key, convertToSimplified(nested)],
    )
    return Object.fromEntries(entries) as T
  }
  return value
}

export const translations: Record<Locale, AppTranslations> = {
  'zh-Hant': baseZhHant,
  'zh-Hans': convertToSimplified(baseZhHant),
  en: baseEn,
}

export function translate(locale: Locale, key: string): string {
  const parts = key.split('.')
  const localeData = translations[locale] || translations['zh-Hant']
  const fallbackData = translations['zh-Hant']

  const lookup = (source: any) => {
    return parts.reduce<any>((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), source)
  }

  const value = lookup(localeData)
  if (typeof value === 'string') return value
  const fallbackValue = lookup(fallbackData)
  return typeof fallbackValue === 'string' ? fallbackValue : key
}
