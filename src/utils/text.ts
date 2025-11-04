import { Converter } from 'opencc-js'
import type { Locale } from '../i18n/translations'

const twToCn = Converter({ from: 'tw', to: 'cn' })

const localeMap: Record<Locale, string> = {
  'zh-Hant': 'zh-TW',
  'zh-Hans': 'zh-CN',
  en: 'en-US',
}

export function toLocaleText(input: string, locale: Locale): string {
  if (locale === 'zh-Hans') {
    return twToCn(input)
  }
  return input
}

export function formatRelativeDate(date: string, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(localeMap[locale], {
    month: 'numeric',
    day: 'numeric',
  })
  return formatter.format(new Date(date))
}

// Simple relative time formatter used in Topic cards
export function formatRelativeAgo(date: string): string {
  const now = Date.now()
  const ts = new Date(date).getTime()
  if (Number.isNaN(ts)) return 'a few seconds ago'
  const diff = Math.max(0, now - ts)
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * oneHour
  if (diff < oneHour) return 'a few seconds ago'
  if (diff < oneDay) {
    const h = Math.max(1, Math.floor(diff / oneHour))
    return `${h} hours ago`
  }
  const d = Math.max(1, Math.floor(diff / oneDay))
  return `${d} days ago`
}
