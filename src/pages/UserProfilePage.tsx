import Header from '../components/Header'
import Footer from '../components/Footer'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { withAuthHeaders, withBase, getJson, type ListResponse } from '../api/client'
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
import { PencilSimple, Eye, UserCircle, CaretRight } from 'phosphor-react'
import { useNavigate } from 'react-router-dom'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

type PublicUser = { id: string; name?: string; email?: string; picture?: string; bio?: string | null; topics?: string[]; points?: string[]; comments?: string[] }

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useLanguage()
  const { user: me } = useAuth()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [tab, setTab] = useState<'new'|'hot'|'old'>('new')
  const [points, setPoints] = useState<Point[]>([])
  const [allPointsCache, setAllPointsCache] = useState<Point[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [bioDraft, setBioDraft] = useState('')
  const navigate = useNavigate()
  const [saveOk, setSaveOk] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [viewAsGuest, setViewAsGuest] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingPoints, setLoadingPoints] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [hasMorePoints, setHasMorePoints] = useState(true)
  const [pointsPage, setPointsPage] = useState(1)
  const [initialPointsLoaded, setInitialPointsLoaded] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const POINTS_PAGE_SIZE = 20

  useEffect(() => {
    let aborted = false
    setLoadingProfile(true)
    setNotFound(false)
    ;(async () => {
      try {
        const resp = await fetch(withBase(`/api/users/${encodeURIComponent(id || '')}`)).then(r => (r.ok ? r.json() : null)).catch(() => null)
        if (!aborted) {
          setUser(resp?.data || null)
          setNotFound(!resp?.data)
        }
      } catch {
        if (!aborted) {
          setUser(null)
          setNotFound(true)
        }
      } finally {
        if (!aborted) setLoadingProfile(false)
      }
    })()
    return () => { aborted = true }
  }, [id])

  const sortPoints = (items: Point[], currentTab: typeof tab) => {
    const sorted = [...items]
    if (currentTab === 'new') {
      sorted.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    } else if (currentTab === 'old') {
      sorted.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
    } else {
      sorted.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
    }
    return sorted
  }

  const fetchFallbackPoints = useCallback(async () => {
    const pointIds = Array.isArray((user as any)?.points) ? Array.from(new Set((user as any).points as string[])) : []
    if (!pointIds.length) {
      setAllPointsCache([])
      setPoints([])
      setHasMorePoints(false)
      setInitialPointsLoaded(true)
      setLoadingPoints(false)
      setUsingFallback(true)
      return
    }
    try {
      const fetched = await Promise.all(
        pointIds.map(async (pid) => {
          try {
            const resp = await getJson<{ data: Point }>(`/api/points/${encodeURIComponent(pid)}`)
            return resp.data
          } catch {
            return null
          }
        }),
      )
      const valid = fetched.filter(Boolean) as Point[]
      setAllPointsCache(valid)
      setPoints(sortPoints(valid, tab))
      setHasMorePoints(false)
      setInitialPointsLoaded(true)
      setUsingFallback(true)
    } finally {
      setLoadingPoints(false)
    }
  }, [tab, user])

  const loadPointsPage = useCallback(
    async (nextPage: number, _append: boolean) => {
      setLoadingPoints(true)
      try {
        const list = await getJson<ListResponse<Point>>(`/api/points?user=${encodeURIComponent(id || '')}&page=${nextPage}&size=${POINTS_PAGE_SIZE}&sort=${tab}`)
        const items = list.items || []
        if (nextPage === 1) setPoints(items as any)
        else setPoints((prev) => [...prev, ...(items as any)])
        setPointsPage(nextPage)
        if (typeof list.total === 'number') {
          setHasMorePoints(nextPage * POINTS_PAGE_SIZE < list.total)
        } else {
          setHasMorePoints(items.length === POINTS_PAGE_SIZE)
        }
        setInitialPointsLoaded(true)
        setUsingFallback(false)
      } catch (err) {
        if (nextPage === 1) {
          await fetchFallbackPoints()
        } else {
          setHasMorePoints(false)
          setLoadingPoints(false)
        }
        return
      }
      setLoadingPoints(false)
    },
    [fetchFallbackPoints, id, tab],
  )

  useEffect(() => {
    setPoints([])
    setInitialPointsLoaded(false)
    setHasMorePoints(true)
    setPointsPage(1)
    loadPointsPage(1, false)
  }, [id, tab, loadPointsPage])

  useEffect(() => {
    if (!usingFallback || !allPointsCache.length) return
    setPoints(sortPoints(allPointsCache, tab))
  }, [allPointsCache, tab, usingFallback])

  useEffect(() => {
    if (usingFallback || !initialPointsLoaded || loadingPoints || !hasMorePoints) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        observerRef.current?.disconnect()
        loadPointsPage(pointsPage + 1, true)
      }
    })
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [usingFallback, initialPointsLoaded, loadingPoints, hasMorePoints, loadPointsPage, pointsPage])

  const pointsSkeleton = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, idx) => (
        <Box key={`point-skel-${idx}`} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 2 }}>
          <Skeleton variant="text" width="90%" height={24} />
          <Skeleton variant="text" width="60%" height={18} />
        </Box>
      )),
    [],
  )
  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <Box sx={{ maxWidth: 840, mx: 'auto', p: 2 }}>
          <PageHeader
            title=""
            backButton
            onBack={() => {
              if (window.history.length > 2) navigate(-1)
              else navigate('/topics')
            }}
          />
          {loadingProfile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={72} height={72} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width={180} height={28} />
                  <Skeleton variant="text" width={200} height={18} />
                </Box>
              </Box>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Box>
          ) : user ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ width: 72, height: 72 }} src={user.picture || undefined}>
                  {!user.picture && (user.name || 'U').slice(0, 1)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ m: 0, fontWeight: 800 }}>{user.name || '用戶'}</Typography>
                  {user.email && <Typography variant="body2" color="text.secondary">{user.email}</Typography>}
                </Box>
              </Box>
              {user.bio && (
                <Typography sx={{ m: 0, mb: 1, fontSize: 16, color: '#0f172a' }}>{user.bio}</Typography>
              )}
              {me?.email && me?.email === user.email && (
                <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                  <PrimaryCtaButton size="sm" onClick={()=> setViewAsGuest(v=>!v)} iconLeft={viewAsGuest ? <UserCircle size={16} weight="bold" /> : <Eye size={16} weight="bold" />}>
                    {viewAsGuest ? (t('user.viewAsMe')) : (t('user.viewAsGuest'))}
                  </PrimaryCtaButton>
                  {!viewAsGuest && (
                    <PrimaryCtaButton size="sm" iconLeft={<PencilSimple size={16} weight="bold" />} onClick={()=>{ setNameDraft(user.name || ''); setBioDraft(user.bio || ''); setEditOpen(true) }}>
                      編輯個人資料
                    </PrimaryCtaButton>
                  )}
                </Box>
              )}
              {(me?.id === user.id || viewAsGuest) && (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>{t('user.milestonesTitle')}</Typography>
                  <Card elevation={0} sx={{ borderRadius: '10px', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 4px rgba(15,35,95,0.06)', mb: 1.5 }}>
                  <CardContent sx={{ p: 0, '&:last-child': { paddingBottom: 0 } }}>
                    <List dense sx={{ py: 0, mb: 0, bgcolor: 'transparent' }}>
                      <ListItem disablePadding secondaryAction={null}>
                        <ListItemButton onClick={() => navigate('/topics')}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              tabIndex={-1}
                              disableRipple
                              checked={(user.comments?.length || 0) > 0}
                              disabled
                              icon={<RadioButtonUnchecked sx={{ color: 'text.disabled' }} />}
                              checkedIcon={<CheckCircle sx={{ color: 'success.main' }} />}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              (user.comments?.length || 0) > 0
                                ? `評論數量：${user.comments?.length || 0}`
                                : t('user.milestoneComment')
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <ListItemButton onClick={() => navigate('/points/add')}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              tabIndex={-1}
                              disableRipple
                              checked={(user.points?.length || 0) > 0}
                              disabled
                              icon={<RadioButtonUnchecked sx={{ color: 'text.disabled' }} />}
                              checkedIcon={<CheckCircle sx={{ color: 'success.main' }} />}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              (user.points?.length || 0) > 0
                                ? `觀點數量：${user.points?.length || 0}`
                                : t('user.milestonePoint')
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <ListItemButton onClick={() => navigate('/topics/add')}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              tabIndex={-1}
                              disableRipple
                              checked={(user.topics?.length || 0) > 0}
                              disabled
                              icon={<RadioButtonUnchecked sx={{ color: 'text.disabled' }} />}
                              checkedIcon={<CheckCircle sx={{ color: 'success.main' }} />}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              (user.topics?.length || 0) > 0
                                ? `主題數量：${user.topics?.length || 0}`
                                : t('user.milestoneTopic')
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
                </>
              )}
              {(((user as any).pointLikes || 0) > 0 || ((user as any).topicLikes || 0) > 0) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 1, fontSize: 14, color: 'text.secondary' }}>
                  {(() => {
                    const tpl = (t('user.pointLikes'))
                    const [pre, post] = tpl.split('{n}')
                    const n = String((user as any).pointLikes || 0)
                    return (
                      <span>
                        {pre}<b style={{ color: '#0f172a' }}>{n}</b>{post}
                      </span>
                    )
                  })()}
                  {(() => {
                    const tpl = (t('user.topicLikes'))
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

              <Typography sx={{ fontWeight: 800, mb: 0.5, fontSize: 30, textAlign: 'center' }}>
                {t('user.pointsTitle')}
              </Typography>
              {!initialPointsLoaded ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>{pointsSkeleton}</Box>
              ) : points.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('user.noPoints')}
                  </Typography>
                  <PrimaryCtaButton to="/points/add" size="sm" className="gap-2 justify-center">
                    新增觀點
                    <CaretRight size={16} weight="bold" />
                  </PrimaryCtaButton>
                </Box>
              ) : (
                <>
                  <SortTabs value={tab} onChange={(v) => setTab(v)} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {points.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => p.topicId && navigate(`/topics/${encodeURIComponent(p.topicId)}`)}
                        style={{ cursor: p.topicId ? 'pointer' : 'default' }}
                      >
                        <PointCard point={p as any} />
                      </div>
                    ))}
                    {!usingFallback && <div ref={sentinelRef} style={{ height: 32 }} />}
                  </Box>
                  {!usingFallback && !hasMorePoints && (
                    <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 13, mt: 1 }}>
                      {t('common.noMore')}
                    </Typography>
                  )}
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <PrimaryCtaButton to="/points/add" size="sm" className="gap-2 justify-center">
                      新增觀點
                      <CaretRight size={16} weight="bold" />
                    </PrimaryCtaButton>
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
                      const r = await fetch(withBase('/api/me'), { method: 'PATCH', headers: withAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ name: nameDraft, bio: bioDraft }) })
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
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {notFound ? '找不到這位用戶。' : '暫時無法載入資料。'}
              </Typography>
            </Box>
          )}
        </Box>
      </main>
      <Footer />
    </div>
  )
}
