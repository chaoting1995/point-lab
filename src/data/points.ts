import type { Hack } from './hacks'
import { hacks, mapHackToLocale } from './hacks'
import type { Locale } from '../i18n/translations'

export type Point = Hack
export const points = hacks as Point[]
export function mapPointToLocale(point: Point, locale: Locale) {
  return mapHackToLocale(point, locale)
}

