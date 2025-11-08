import useLanguage from '../i18n/useLanguage'
import useAuth from '../auth/AuthContext'
import { translations } from '../i18n/translations'

export function Footer() {
  const { locale } = useLanguage()
  const { user } = useAuth()
  const footer = translations[locale].footer

  const discover = footer.discover
  const engage = footer.engage
  const about = footer.about

  return (
    <footer className="footer">
      <div>
        <div className="footer__title">{discover.title}</div>
        <a className="footer__link" href="/topics">
          主題箱
        </a>
        {user && (
          <a className="footer__link" href={`/users/${encodeURIComponent(user.id || user.email || 'me')}`}>
            會員中心
          </a>
        )}
      </div>
      <div>
        <div className="footer__title">{engage.title}</div>
        <div className="footer__link-group">
          <a className="footer__link" href="/topics/add">
            新增主題
          </a>
          <a className="footer__link" href="/points/add">
            新增觀點
          </a>
          <a className="footer__link" href="/guide">
            指南
          </a>
        </div>
      </div>
      <div>
        <div className="footer__title">{about.title}</div>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
          PointLab 的目標，是搜集好觀點。讓觀點可以被分享、辯論、票選、沉澱。
        </p>
      </div>
    </footer>
  )
}

export default Footer
