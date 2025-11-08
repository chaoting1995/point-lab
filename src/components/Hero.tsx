import useLanguage from '../i18n/useLanguage'
import { translations } from '../i18n/translations'
import { useNavigate } from 'react-router-dom'
import { CaretRight } from 'phosphor-react'

export function Hero() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const heroCopy = translations[locale].hero
  const logos = heroCopy.logos ?? []
  const tags = heroCopy.tags ?? ['開源智慧', '沉澱觀點']
  const highlightPhrase = heroCopy.highlightPhrase || ''
  const eyebrow = t('hero.eyebrow')
  const title = heroCopy.title || t('hero.title') || ''
  const titleHighlight = heroCopy.titleHighlight || ''
  const subtitleLines = (t('hero.subtitle') || '').split('\n').filter(line => line.trim().length > 0)

  return (
    <section className="hero">
      <div className="hero__foreground">
        {eyebrow && <div className="hero__eyebrow">{eyebrow}</div>}
        {tags.length > 0 && (
          <div className="hero__tags">
            {tags.map((tag) => (
              <span key={tag} className="hero__tag">
                <span className="hero__tag-icon" aria-hidden="true">
                  ✦
                </span>
                {tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="hero__title text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          {(() => {
            if (titleHighlight && title.includes(titleHighlight)) {
              const [first, ...restParts] = title.split(titleHighlight)
              const rest = restParts.join(titleHighlight)
              return (
                <>
                  {first}
                  <span className="hero__title-highlight">{titleHighlight}</span>
                  {rest}
                </>
              )
            }
            return title
          })()}
        </h1>
        <p className="hero__subtitle text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6">
          {subtitleLines.map((line, idx) => {
            const key = `${line}-${idx}`
            if (highlightPhrase && line.includes(highlightPhrase)) {
              const parts = line.split(highlightPhrase)
              return (
                <span key={key} className="hero__subtitle-line">
                  {parts[0]}
                  <span className="hero__subtitle-highlight">{highlightPhrase}</span>
                  {parts.slice(1).join(highlightPhrase)}
                </span>
              )
            }
            return (
              <span key={key} className="hero__subtitle-line">
                {line}
              </span>
            )
          })}
        </p>

        <div className="hero__actions">
          <button
            type="button"
            className="hero__primary btn btn-primary"
            onClick={() => {
              navigate('/topics')
            }}
          >
            <span>{t('hero.primaryAction')}</span>
            <CaretRight size={18} weight="bold" />
          </button>
        </div>

        {heroCopy.badgeLabel && heroCopy.badgeNote && (
          <div className="hero__badge">
            <span aria-hidden="true" role="img">
              🏆
            </span>
            <span>{t('hero.badgeLabel')}</span>
            <span style={{ color: '#6366f1', fontWeight: 700 }}>
              {t('hero.badgeNote')}
            </span>
          </div>
        )}

        {logos.length > 0 && (
          <div className="hero__logos">
            {logos.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Hero
