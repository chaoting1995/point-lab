import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')
const localesDir = path.join(root, 'src', 'i18n', 'locales')
const outputFile = path.join(root, 'src', 'i18n', 'translations.ts')

function readJson(file) {
  const p = path.join(localesDir, file)
  const raw = fs.readFileSync(p, 'utf-8')
  return JSON.parse(raw)
}

const baseZh = readJson('zh-Hant.json')
const en = readJson('en.json')

const content = `import { Converter } from 'opencc-js'
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

  const lookup = (source: any) => parts.reduce<any>((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), source)

  const value = lookup(localeData)
  if (typeof value === 'string') return value
  const fallbackValue = lookup(fallbackData)
  return typeof fallbackValue === 'string' ? fallbackValue : key
}
`

fs.writeFileSync(outputFile, content)
console.log('Generated translations.ts from locales JSON')
