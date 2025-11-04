import useLanguage from './useLanguage'

export function useTranslation() {
  const { t } = useLanguage()
  return t
}
