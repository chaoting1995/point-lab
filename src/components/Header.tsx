import { useState } from 'react'
import useLanguage from '../i18n/useLanguage'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'phosphor-react'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import { List as ListIcon } from 'phosphor-react'
import { House, Archive, Question, Globe } from 'phosphor-react'
import { SignIn } from 'phosphor-react'
import { SignOut } from 'phosphor-react'
import useAuth from '../auth/AuthContext'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import LoginDialog from './LoginDialog'
import Popover from '@mui/material/Popover'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import useConfirmDialog from '../hooks/useConfirmDialog'

export function Header() {
  const { t, locale, toggleLocale } = useLanguage()
  const { user, login, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const { confirm, ConfirmDialogEl } = useConfirmDialog()
  const location = useLocation()
  const path = location.pathname || '/'
  const onTopicDetail = path.startsWith('/topics/') && path !== '/topics' && path !== '/topics/add'
  const currentTopicId = onTopicDetail ? path.split('/')[2] : undefined
  const onTopicsList = path === '/topics'

  return (
    <header className="header navbar bg-base-100">
      <Link to="/" className="header__brand" aria-label="PointLab">
        <img src="/logo.svg" alt="PointLab logo" className="header__brand-logo" />
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
          <>
            <Tooltip title={user.email || user.name || ''}>
              <button
                aria-label="使用者選單"
                onClick={(e)=> { try { (e.currentTarget as HTMLButtonElement).blur() } catch {}; setUserMenuAnchor(e.currentTarget as unknown as HTMLElement) }}
                style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, display: 'inline-flex', cursor: 'pointer' }}
              >
                <Avatar sx={{ width: 28, height: 28 }} src={user.picture || undefined} alt={user.name || 'user'}>
                  {!user.picture && (user.name || 'U').slice(0, 1)}
                </Avatar>
              </button>
            </Tooltip>
            <Popover
              open={!!userMenuAnchor}
              anchorEl={userMenuAnchor}
              onClose={() => { setUserMenuAnchor(null); try { (document.activeElement as HTMLElement)?.blur() } catch {} }}
              disableAutoFocus
              disableEnforceFocus
              disableRestoreFocus
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { borderRadius: 3, width: 320, p: 2, mt: '10px' } }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>{user.email}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 64, height: 64 }} src={user.picture || undefined} alt={user.name || 'user'}>
                    {!user.picture && (user.name || 'U').slice(0, 1)}
                  </Avatar>
                  <Typography variant="h6" sx={{ m: 0, fontWeight: 800, textAlign: 'center', width: '100%' }}>
                    {user.role === 'superadmin' ? (
                      <>
                        尊榮的超級管理者
                        <br />
                        {user.name || ''}
                        <br />
                        歡迎你！
                      </>
                    ) : (user.role === 'admin' ? (
                      <>
                        尊榮的網站管理者
                        <br />
                        {user.name || ''}
                        <br />
                        歡迎你！
                      </>
                    ) : (
                      <>
                        尊榮的會員
                        <br />
                        {user.name || '用戶'}
                        <br />
                        歡迎你！
                      </>
                    ))}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={()=> { setUserMenuAnchor(null); if (user?.id) navigate(`/users/${encodeURIComponent(user.id)}`) }}>
                    {t('user.profileCenter')}
                  </Button>
                  {(user as any)?.role && ((user as any).role==='admin' || (user as any).role==='superadmin') && (
                    <Button variant="contained" size="small" onClick={()=> { setUserMenuAnchor(null); navigate('/admin') }}>
                      {t('user.adminConsole')}
                    </Button>
                  )}
                </Box>
                <Divider sx={{ my: 1 }} />
                <Button color="inherit" sx={{ alignSelf: 'center' }} onClick={async () => {
                  const ok = await confirm({ title: '確認登出？' })
                  if (ok) {
                    setUserMenuAnchor(null)
                    logout()
                  }
                }}>
                  {t('nav.logout')}
                </Button>
              </Box>
            </Popover>
          </>
        )}
        <IconButton
          aria-label="主選單"
          size="small"
          onClick={() => setDrawerOpen(true)}
          sx={{ borderRadius: '10px' }}
        >
          <ListIcon size={18} />
        </IconButton>
        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <div style={{ width: 280 }}>
            <List sx={{ py: 1, '& .MuiListItemIcon-root': { minWidth: 32 } }}>
            {user && (
              <>
                <ListItemButton disableRipple disableTouchRipple sx={{ cursor: 'default' }}>
                  <ListItemIcon>
                    <Avatar sx={{ width: 28, height: 28 }} src={user.picture || undefined} alt={user.name || 'user'}>
                      {!user.picture && (user.name || 'U').slice(0, 1)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText primary={user.name || '用戶'} secondary={user.email || ''} />
                </ListItemButton>
                <Divider sx={{ my: 0.5 }} />
              </>
            )}
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
              <ListItemText primary={t('nav.guide')} />
            </ListItemButton>
            <Divider sx={{ my: 0.5 }} />
            {/* 語系切換：單行 + 點擊切換 */}
            <ListItemButton onClick={() => toggleLocale()} sx={{ display: 'flex', alignItems: 'center' }}>
              <ListItemIcon>
                <Globe size={18} />
              </ListItemIcon>
              <ListItemText primary={`${t('languageToggle.ariaLabel')}：${locale==='zh-Hant' ? (t('languageToggle.traditional')) : (locale==='zh-Hans' ? (t('languageToggle.simplified')) : (t('languageToggle.english')))}`} />
            </ListItemButton>
            <Divider sx={{ my: 0.5 }} />
            {!user ? (
              <ListItemButton onClick={() => { setLoginOpen(true); }}>
                <ListItemIcon>
                  <SignIn size={20} />
                </ListItemIcon>
                <ListItemText primary={t('nav.login')} />
              </ListItemButton>
            ) : (
              <ListItemButton onClick={async () => {
                const ok = await confirm({ title: '確認登出？' })
                if (ok) {
                  logout()
                }
                setDrawerOpen(false)
              }}>
                <ListItemIcon>
                  <SignOut size={20} />
                </ListItemIcon>
                <ListItemText primary={t('nav.logout')} secondary={user.email || user.name} />
              </ListItemButton>
            )}
            </List>
          </div>
        </Drawer>
        <LoginDialog open={loginOpen} onClose={() => { setLoginOpen(false); setDrawerOpen(false) }} onLogin={login} />
        {ConfirmDialogEl}
      </div>
    </header>
  )
}

export default Header
