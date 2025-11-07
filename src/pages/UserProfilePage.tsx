import Header from '../components/Header'
import Footer from '../components/Footer'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { withBase, getJson, type ListResponse } from '../api/client'
import useLanguage from '../i18n/useLanguage'
import useAuth from '../auth/AuthContext'
import SortTabs from '../components/SortTabs'
import PointCard from '../components/PointCard'
import type { Point } from '../data/points'
import PageHeader from '../components/PageHeader'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Checkbox from '@mui/material/Checkbox'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { PencilSimple, Plus, Eye, UserCircle } from 'phosphor-react'
import { useNavigate } from 'react-router-dom'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

type PublicUser = { id: string; name?: string; email?: string; picture?: string; bio?: string | null; topics?: string[]; points?: string[]; comments?: string[] }

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useLanguage()
  const { user: me } = useAuth()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [tab, setTab] = useState<'new'|'hot'|'old'>('new')
  const [points, setPoints] = useState<Point[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [bioDraft, setBioDraft] = useState('')
  const navigate = useNavigate()
  const [saveOk, setSaveOk] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [viewAsGuest, setViewAsGuest] = useState(false)
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const d = await fetch(withBase(`/api/users/${encodeURIComponent(id || '')}`)).then(r=>r.ok?r.json():null).catch(()=>null)
        if (!aborted) setUser(d?.data || null)
        const list = await getJson<ListResponse<Point>>(`/api/points?user=${encodeURIComponent(id||'')}&page=1&size=20&sort=${tab}`)
        if (!aborted) setPoints(list.items as any)
      } catch {/* ignore */}
    })()
    return () => { aborted = true }
  }, [id, tab])
  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <Box sx={{ maxWidth: 840, mx: 'auto', p: 2 }}>
          <PageHeader title={(t('user.profileCenter') || '會員中心')} backButton onBack={()=>history.back()} />
          {user ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 72, height: 72 }} src={user.picture || undefined}>{(user.name || 'U').slice(0,1)}</Avatar>
                <Box>
                  <Typography variant="h6" sx={{ m: 0, fontWeight: 800 }}>{user.name || '用戶'}</Typography>
                  {user.email && <Typography variant="body2" color="text.secondary">{user.email}</Typography>}
                </Box>
              </Box>
              {user.bio && (
                <Typography sx={{ m: 0, mb: 1, fontSize: 16, color: '#0f172a' }}>{user.bio}</Typography>
              )}
              {me?.email && me?.email === user.email && (
                <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                  <PrimaryCtaButton size="sm" onClick={()=> setViewAsGuest(v=>!v)} iconLeft={viewAsGuest ? <UserCircle size={16} weight="bold" /> : <Eye size={16} weight="bold" />}>
                    {viewAsGuest ? (t('user.viewAsMe') || '我的視角') : (t('user.viewAsGuest') || '訪客視角')}
                  </PrimaryCtaButton>
                  {!viewAsGuest && (
                    <PrimaryCtaButton size="sm" iconLeft={<PencilSimple size={16} weight="bold" />} onClick={()=>{ setNameDraft(user.name || ''); setBioDraft(user.bio || ''); setEditOpen(true) }}>
                      編輯個人資料
                    </PrimaryCtaButton>
                  )}
                </Box>
              )}
              <Divider sx={{ my: 1 }} />

              {me?.id === user.id && !viewAsGuest && (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>{t('user.milestonesTitle') || '里程碑'}</Typography>
                  <Card elevation={0} sx={{ borderRadius: '10px', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 4px rgba(15,35,95,0.06)', mb: 1.5 }}>
                  <CardContent sx={{ p: 0, '&:last-child': { paddingBottom: 0 } }}>
                    <List dense sx={{ py: 0, mb: 0, bgcolor: 'transparent' }}>
                      <ListItem disablePadding secondaryAction={null}>
                        <ListItemButton onClick={() => navigate('/topics/add')}>
                          <ListItemIcon>
                            <Checkbox edge="start" tabIndex={-1} disableRipple checked={(user.topics?.length || 0) > 0} disabled
                              icon={<RadioButtonUnchecked sx={{ color: 'text.disabled' }} />}
                              checkedIcon={<CheckCircle sx={{ color: 'success.main' }} />} />
                          </ListItemIcon>
                          <ListItemText primary={t('user.milestoneTopic') || '新增第一個主題'} />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <ListItemButton onClick={() => navigate('/topics')}>
                          <ListItemIcon>
                            <Checkbox edge="start" tabIndex={-1} disableRipple checked={(user.points?.length || 0) > 0} disabled
                              icon={<RadioButtonUnchecked sx={{ color: 'text.disabled' }} />}
                              checkedIcon={<CheckCircle sx={{ color: 'success.main' }} />} />
                          </ListItemIcon>
                          <ListItemText primary={t('user.milestonePoint') || '新增第一則觀點'} />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <ListItemButton onClick={() => navigate('/topics')}>
                          <ListItemIcon>
                            <Checkbox edge="start" tabIndex={-1} disableRipple checked={(user.comments?.length || 0) > 0} disabled
                              icon={<RadioButtonUnchecked sx={{ color: 'text.disabled' }} />}
                              checkedIcon={<CheckCircle sx={{ color: 'success.main' }} />} />
                          </ListItemIcon>
                          <ListItemText primary={t('user.milestoneComment') || '新增第一則評論'} />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
                </>
              )}
              <Box sx={{ display: 'flex', gap: 0, mb: 1, color: 'text.secondary', alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
                <span style={{ marginRight: 6 }}>發布數量：</span>
                <span>觀點 <b style={{ color: '#0f172a' }}>{user.points?.length || 0}</b></span>
                <span style={{ margin: 0 }}>・</span>
                <span>評論 <b style={{ color: '#0f172a' }}>{user.comments?.length || 0}</b></span>
                <span style={{ margin: 0 }}>・</span>
                <span>主題 <b style={{ color: '#0f172a' }}>{user.topics?.length || 0}</b></span>
              </Box>
              {(((user as any).pointLikes || 0) > 0 || ((user as any).topicLikes || 0) > 0) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 1, fontSize: 14, color: 'text.secondary' }}>
                  {(() => {
                    const tpl = (t('user.pointLikes') || '觀點總計讚數：{n}')
                    const [pre, post] = tpl.split('{n}')
                    const n = String((user as any).pointLikes || 0)
                    return (
                      <span>
                        {pre}<b style={{ color: '#0f172a' }}>{n}</b>{post}
                      </span>
                    )
                  })()}
                  {(() => {
                    const tpl = (t('user.topicLikes') || '主題總計讚數：{n}')
                    const [pre, post] = tpl.split('{n}')
                    const n = String((user as any).topicLikes || 0)
                    return (
                      <span>
                        {pre}<b style={{ color: '#0f172a' }}>{n}</b>{post}
                      </span>
                    )
                  })()}
                </Box>
              )}
              <Divider sx={{ my: 1 }} />

              <Typography sx={{ fontWeight: 800, mb: 0.5, fontSize: 30, textAlign: 'center' }}>{t('user.pointsTitle') || '發布過的觀點'}</Typography>
              {points.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('user.noPoints') || '還沒有發布過任何觀點！'}</Typography>
                  {me?.id === user.id && (
                    <PrimaryCtaButton to="/points/add" size="sm" iconLeft={<Plus size={16} weight="bold" />}>{t('header.cta') || '新增觀點'}</PrimaryCtaButton>
                  )}
                </Box>
              ) : (
                <>
                  <SortTabs value={tab} onChange={(v)=> setTab(v)} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {points.map(p => (
                      <div key={p.id} onClick={()=> p.topicId && navigate(`/topics/${encodeURIComponent(p.topicId)}`)} style={{ cursor: p.topicId ? 'pointer' : 'default' }}>
                        <PointCard point={p as any} />
                      </div>
                    ))}
                  </Box>
                </>
              )}
              <Dialog open={editOpen} onClose={()=> setEditOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '10px' } }}>
                <DialogTitle>編輯個人資料</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 2, px: 2, '&.MuiDialogContent-root': { paddingTop: '16px !important' } }}>
                  <TextField label="名稱" value={nameDraft} onChange={(e)=> setNameDraft(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                  <TextField label="簡介" value={bioDraft} onChange={(e)=> setBioDraft(e.target.value)} fullWidth multiline minRows={3} InputLabelProps={{ shrink: true }} />
                </DialogContent>
                <DialogActions sx={{ px: 2, pt: 2, pb: 2, justifyContent: 'center', gap: 1.5 }}>
                  <Button onClick={()=> setEditOpen(false)} variant="outlined" sx={(t)=>({
                    color: t.palette.text.secondary,
                    borderColor: t.palette.divider,
                    '&:hover': { borderColor: t.palette.text.disabled, bgcolor: t.palette.action.hover },
                    borderRadius: '10px', minWidth: 96,
                  })}>取消</Button>
                  <Button variant="contained" sx={(t)=>({ borderRadius: '10px', minWidth: 96, bgcolor: t.palette.primary.main, '&:hover': { bgcolor: t.palette.primary.dark } })}
                    onClick={async ()=>{
                    try {
                      const r = await fetch(withBase('/api/me'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name: nameDraft, bio: bioDraft }) })
                      if (!r.ok) throw new Error('儲存失敗')
                      const d = await r.json()
                      setUser((u)=> u ? { ...u, name: d.data.name, bio: d.data.bio } : u)
                      setEditOpen(false)
                      setSaveOk(true)
                    } catch (e) {
                      setSaveErr(e instanceof Error ? e.message : '儲存失敗')
                    }
                  }}>儲存</Button>
                </DialogActions>
              </Dialog>
              <Snackbar open={saveOk} autoHideDuration={1600} onClose={()=> setSaveOk(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="success" variant="filled" sx={{ borderRadius: '10px' }}>已儲存</Alert>
              </Snackbar>
              <Snackbar open={!!saveErr} autoHideDuration={2000} onClose={()=> setSaveErr(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="error" variant="filled" sx={{ borderRadius: '10px' }}>{saveErr}</Alert>
              </Snackbar>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">載入中…</Typography>
          )}
        </Box>
      </main>
      <Footer />
    </div>
  )
}
