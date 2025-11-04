import useLanguage from '../i18n/useLanguage'

export function LanguageToggle() {
  const { locale, toggleLocale, t } = useLanguage()

  let label = t('languageToggle.traditional')
  if (locale === 'zh-Hans') label = t('languageToggle.simplified')
  if (locale === 'en') label = t('languageToggle.english')

  return (
    <button
      type="button"
      className="language-toggle__option btn btn-ghost btn-sm"
      aria-label={t('languageToggle.ariaLabel')}
      onClick={toggleLocale}
    >
      {label}
    </button>
  )
}

export default LanguageToggle
