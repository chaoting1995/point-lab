import useLanguage from '../i18n/useLanguage'
import { translations } from '../i18n/translations'

export function Footer() {
  const { locale } = useLanguage()
  const footer = translations[locale].footer

  const discover = footer.discover
  const engage = footer.engage
  const about = footer.about

  return (
    <footer className="footer">
      <div>
        <div className="footer__title">{discover.title}</div>
        {discover.items.map((item) => (
          <a key={item} className="footer__link" href="#point-tabs">
            {item}
          </a>
        ))}
      </div>
      <div>
        <div className="footer__title">{engage.title}</div>
        {engage.items.map((item) => (
          <a key={item} className="footer__link" href="#point-tabs">
            {item}
          </a>
        ))}
      </div>
      <div>
        <div className="footer__title">{about.title}</div>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
          {about.intro}
        </p>
      </div>
    </footer>
  )
}

export default Footer
