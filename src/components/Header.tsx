import { useState } from 'react'
import LanguageToggle from '../components/LanguageToggle'
import useLanguage from '../i18n/useLanguage'
import { Link, useLocation } from 'react-router-dom'
import { Plus } from 'phosphor-react'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import MenuIcon from '@mui/icons-material/Menu'
import { House, Archive, Question } from 'phosphor-react'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import useAuth from '../auth/AuthContext'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'

export function Header() {
  const { t } = useLanguage()
  const { user, login, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const path = location.pathname || '/'
  const onTopicDetail = path.startsWith('/topics/') && path !== '/topics' && path !== '/topics/add'
  const currentTopicId = onTopicDetail ? path.split('/')[2] : undefined
  const onTopicsList = path === '/topics'

  return (
    <header className="header navbar bg-base-100">
      <Link to="/" className="header__brand" aria-label="PointLab">
        <span className="header__brand-logo">P</span>
        <span className="header__brand-name">PointLab</span>
      </Link>
      <nav className="header__center" aria-label="PointLab navigation">
      </nav>
      <div className="header__actions">
        {onTopicDetail && (
          <PrimaryCtaButton
            iconLeft={<Plus size={16} weight="bold" />}
            onClick={() => {
              if (currentTopicId) {
                window.location.assign(`/points/add?topic=${encodeURIComponent(currentTopicId)}`)
              }
            }}
          >
            {t('header.cta')}
          </PrimaryCtaButton>
        )}
        {onTopicsList && (
          <PrimaryCtaButton to="/topics/add" size="sm" iconLeft={<Plus size={16} weight="bold" /> }>
            {t('topics.list.add')}
          </PrimaryCtaButton>
        )}
        {user && (
          <Tooltip title={user.email || user.name || ''}>
            <Avatar sx={{ width: 28, height: 28 }} src={user.picture} alt={user.name || 'user'}>
              {(user.name || 'U').slice(0, 1)}
            </Avatar>
          </Tooltip>
        )}
        <IconButton
          aria-label="主選單"
          size="small"
          onClick={() => setDrawerOpen(true)}
          sx={{ borderRadius: '10px' }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>
        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <div style={{ width: 280 }}>
            <List sx={{ py: 1, '& .MuiListItemIcon-root': { minWidth: 32 } }}>
            <ListItemButton component={Link} to="/" onClick={() => setDrawerOpen(false)}>
              <ListItemIcon>
                <House size={18} />
              </ListItemIcon>
              <ListItemText primary={t('nav.home')} />
            </ListItemButton>
            <ListItemButton component={Link} to="/topics" onClick={() => setDrawerOpen(false)}>
              <ListItemIcon>
                <Archive size={18} />
              </ListItemIcon>
              <ListItemText primary={t('nav.topics')} />
            </ListItemButton>
            <ListItemButton component={Link} to="/guide" onClick={() => setDrawerOpen(false)}>
              <ListItemIcon>
                <Question size={18} />
              </ListItemIcon>
              <ListItemText primary={t('nav.guide') || '指南'} />
            </ListItemButton>
            <Divider sx={{ my: 0.5 }} />
            {/* 語系切換移入選單 */}
            <ListItemButton disableRipple disableTouchRipple sx={{ cursor: 'default' }}>
              <ListItemText primary={t('languageToggle.ariaLabel')} />
            </ListItemButton>
            <ListItemButton disableGutters>
              <div style={{ padding: '0 16px' }}>
                <LanguageToggle />
              </div>
            </ListItemButton>
            <Divider sx={{ my: 0.5 }} />
            {!user ? (
              <ListItemButton onClick={async () => { await login(); setDrawerOpen(false) }}>
                <ListItemIcon>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText primary={t('nav.login') || '登入'} />
              </ListItemButton>
            ) : (
              <ListItemButton onClick={() => { logout(); setDrawerOpen(false) }}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary={t('nav.logout') || '登出'} secondary={user.email || user.name} />
              </ListItemButton>
            )}
            </List>
          </div>
        </Drawer>
      </div>
    </header>
  )
}

export default Header
