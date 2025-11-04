import useLanguage from '../i18n/useLanguage'
import { translations } from '../i18n/translations'

export function Hero() {
  const { t, locale } = useLanguage()
  const heroCopy = translations[locale].hero
  const logos = heroCopy.logos ?? []
  const eyebrow = t('hero.eyebrow')

  return (
    <section className="layout-card hero p-8 md:p-10">
      {eyebrow && <div className="hero__eyebrow">{eyebrow}</div>}
      <h1 className="hero__title text-4xl md:text-5xl font-extrabold tracking-tight mb-3">{t('hero.title')}</h1>
      <p className="hero__subtitle text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6">{t('hero.subtitle')}</p>

      <div className="hero__actions">
        <button
          type="button"
          className="hero__primary btn btn-primary"
          onClick={() => {
            const target = document.querySelector<HTMLDivElement>('#hot')
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        >
          {t('hero.primaryAction')}
        </button>
        <button
          type="button"
          className="hero__secondary btn btn-ghost text-primary"
          onClick={() => {
            const target = document.querySelector<HTMLDivElement>('#new')
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        >
          {t('hero.secondaryAction')}
        </button>
      </div>

      <div className="hero__badge">
        <span aria-hidden="true" role="img">
          🏆
        </span>
        <span>{t('hero.badgeLabel')}</span>
        <span style={{ color: '#6366f1', fontWeight: 700 }}>
          {t('hero.badgeNote')}
        </span>
      </div>

      <div className="hero__logos">
        {(logos.length > 0 ? logos : ['Product Hunt', 'Maker Stations', 'Indie Hackers']).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </section>
  )
}

export default Hero
