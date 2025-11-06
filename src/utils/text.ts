import { Converter } from 'opencc-js'
import type { Locale } from '../i18n/translations'
import { translate } from '../i18n/translations'

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
export function formatRelativeAgo(date: string, locale?: Locale): string {
  const now = Date.now()
  const ts = new Date(date).getTime()
  const loc: Locale | undefined = locale
  const t = (key: string, n?: number) => {
    if (!loc) return key === 'justNow' ? 'a few seconds ago' : key === 'hours' ? `${n} hours ago` : `${n} days ago`
    const base = translate(loc, `common.time.${key}`)
    return typeof base === 'string' ? base.replace('{n}', String(n ?? '')) : String(base)
  }
  if (Number.isNaN(ts)) return t('justNow')
  const diff = Math.max(0, now - ts)
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * oneHour
  if (diff < oneHour) return t('justNow')
  if (diff < oneDay) {
    const h = Math.max(1, Math.floor(diff / oneHour))
    return t('hours', h)
  }
  const d = Math.max(1, Math.floor(diff / oneDay))
  return t('days', d)
}
