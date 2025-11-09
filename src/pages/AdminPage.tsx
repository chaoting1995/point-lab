import Header from '../components/Header'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { House, Users, Flag } from 'phosphor-react'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { getJson, withAuthHeaders, withBase } from '../api/client'
import Avatar from '@mui/material/Avatar'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type MouseEvent } from 'react'
import useAuth from '../auth/AuthContext'
import useLanguage from '../i18n/useLanguage'
import GoogleLoginButton from '../components/GoogleLoginButton'
// 圖表：近 28 天新增觀點數（使用 MUI X Charts）
// 安裝套件：@mui/x-charts
import { LineChart } from '@mui/x-charts'
import Divider from '@mui/material/Divider'
import TableContainer from '@mui/material/TableContainer'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Paper from '@mui/material/Paper'
import useConfirmDialog from '../hooks/useConfirmDialog'
// 時間以絕對時間呈現
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import Pagination from '@mui/material/Pagination'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

type AdminUser = { id: string; name?: string; email?: string; picture?: string; role?: string; topics?: string[]; points?: string[]; comments?: string[] }
type Guest = { id: string; name?: string; posts_topic?: number; posts_point?: number; posts_comment?: number; created_at?: string; last_seen?: string }

export default function AdminPage() {
  const { t } = useLanguage()
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'home'|'users'|'reports'>('home')
  const [users, setUsers] = useState<Array<AdminUser & { topicCount?: number; pointCount?: number; commentCount?: number }>>([])
  const [usersTotal, setUsersTotal] = useState<number>(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [reportsTotal, setReportsTotal] = useState<number>(0)
  const [userQuery, setUserQuery] = useState('')
  const [reportType, setReportType] = useState<'all'|'topic'|'point'|'comment'>('all')
  const [stats, setStats] = useState<{users:number;topics:number;points:number;comments:number;reports:number} | null>(null)
  const { confirm, ConfirmDialogEl } = useConfirmDialog()
  const pageSize = 20
  const [usersPage, setUsersPage] = useState(1)
  const [usersRoleFilter, setUsersRoleFilter] = useState<'all'|'member'|'guest'>('member')
  const [reportsPage, setReportsPage] = useState(1)

  useEffect(() => {
    if (tab !== 'users') return
    setUsersLoading(true)
    setUsers([])
    const mapMemberRows = (rows: any[]) =>
      (rows || []).map((u: any) => ({
        ...u,
        topicCount: Array.isArray(u.topics) ? u.topics.length : (u.topicCount || 0),
        pointCount: Array.isArray(u.points) ? u.points.length : (u.pointCount || 0),
        commentCount: Array.isArray(u.comments) ? u.comments.length : (u.commentCount || 0),
      }))

    const mapGuestRows = (list: Guest[]) =>
      (list || []).map((g) => ({
        id: g.id,
        name: g.name || '訪客',
        email: '',
        picture: undefined,
        role: 'guest',
        topics: [],
        points: [],
        comments: [],
        topicCount: g.posts_topic || 0,
        pointCount: g.posts_point || 0,
        commentCount: g.posts_comment || 0,
        lastSeen: g.last_seen || g.created_at || null,
      }))

    const fetchUsers = async () => {
      try {
        if (usersRoleFilter === 'guest') {
          const url = `/api/admin/guests?page=${usersPage}&size=${pageSize}&q=${encodeURIComponent(userQuery)}`
          const resp = await fetch(withBase(url), { credentials: 'include', headers: withAuthHeaders({}) })
          if (!resp.ok) throw new Error('GUESTS_FAILED')
          const d = await resp.json()
          const guestRows = mapGuestRows(d.items || [])
          setUsers(guestRows)
          setUsersTotal(d.total || guestRows.length)
        } else if (usersRoleFilter === 'member') {
          const resp = await fetch(withBase(`/api/admin/users?page=${usersPage}&size=${pageSize}`), { credentials: 'include', headers: withAuthHeaders({}) })
          if (!resp.ok) throw new Error('USERS_FAILED')
          const d = await resp.json()
          const rows = mapMemberRows(d.items || [])
          setUsers(rows)
          setUsersTotal(d.total || rows.length)
        } else {
          const [membersResp, guestsResp] = await Promise.all([
            fetch(withBase(`/api/admin/users?page=${usersPage}&size=${pageSize}`), { credentials: 'include', headers: withAuthHeaders({}) }),
            fetch(withBase(`/api/admin/guests?page=${usersPage}&size=${pageSize}&q=${encodeURIComponent(userQuery)}`), { credentials: 'include', headers: withAuthHeaders({}) }),
          ])
          if (!membersResp.ok || !guestsResp.ok) throw new Error('ALL_FAILED')
          const membersJson = await membersResp.json()
          const guestsJson = await guestsResp.json()
          const memberRows = mapMemberRows(membersJson.items || [])
          const guestRows = mapGuestRows(guestsJson.items || [])
          setUsers([...memberRows, ...guestRows])
          setUsersTotal((membersJson.total || memberRows.length) + (guestsJson.total || guestRows.length))
        }
      } catch {
        setUsers([])
        setUsersTotal(0)
      } finally {
        setUsersLoading(false)
      }
    }
    fetchUsers()
  }, [tab, usersPage, usersRoleFilter, userQuery])

  // 路由 -> tab
  useEffect(() => {
    if (location.pathname.startsWith('/admin/users')) setTab('users')
    else if (location.pathname.startsWith('/admin/reports')) setTab('reports')
    else setTab('home')
    setUsersPage(1)
    setReportsPage(1)
  }, [location.pathname])

  // 進入 reports 或切換類型時載入資料
  useEffect(() => {
    if (tab !== 'reports') return
    ;(async () => {
      try {
        const base = reportType==='all' ? '/api/admin/reports' : (`/api/admin/reports?type=${reportType}`)
        const d = await getJson<any>(`${base}${base.includes('?')?'&':'?'}page=${reportsPage}&size=${pageSize}`)
        setReports(d.items || [])
        setReportsTotal(d.total || 0)
      } catch {
        setReports([]); setReportsTotal(0)
      }
    })()
  }, [tab, reportType, reportsPage])

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="app">
        <Header />
        <main className="admin__inner" style={{ display: 'flex' }}>
          <Box sx={{ flex: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '96px' }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: '10px', border: '1px solid', borderColor: 'divider', textAlign: 'center', maxWidth: 360 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{t('auth.loginTitle')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('auth.loginDesc')}</Typography>
              <GoogleLoginButton onClick={async () => { await login() }} />
            </Paper>
          </Box>
        </main>
      </div>
    )
  }

  const drawerWidth = 220
  const collapsedWidth = 72
  return (
    <div className="app">
      <Header />
      <main className="admin__inner" style={{ display: 'flex' }}>
        <Box component="aside" sx={{
          width: { xs: collapsedWidth, lg: drawerWidth },
          flexShrink: 0,
          position: 'fixed',
          left: 0,
          top: 56,
          height: 'calc(100vh - 56px)',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          zIndex: 10,
        }}>
          {/* 側欄頂部：頭像 + 名稱 */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'center', justifyContent: { xs: 'center', lg: 'flex-start' }, gap: 1, p: { xs: 1.5, lg: 2 }, width: '100%' }}>
            <Avatar src={user?.picture || undefined} sx={{ width: { xs: 40, lg: 56 }, height: { xs: 40, lg: 56 }, mx: { xs: 'auto', lg: 0 } }}>
              {!user?.picture && (user?.name || 'U').slice(0, 1)}
            </Avatar>
            <Typography sx={{ fontWeight: 800, display: { xs: 'none', lg: 'block' }, ml: { lg: 1 } }}>{user?.name || '管理者'}</Typography>
          </Box>
          <Divider sx={{ my: 0 }} />
          <List sx={{
            py: 1,
            '& .label': { display: { xs: 'none', lg: 'block' } },
            '& .MuiListItemButton-root': {
              justifyContent: { xs: 'center', lg: 'flex-start' },
              borderRadius: '10px',
              mx: 1,
              my: 0.5,
              minHeight: 44,
              px: { xs: 0, lg: 2 },
            },
            '& .MuiListItemIcon-root': {
              minWidth: { xs: 0, lg: 40 },
              mr: { xs: 0, lg: 1.5 },
            },
            '& .MuiListItemButton-root.Mui-selected': {
              bgcolor: 'action.selected',
            },
            '& .MuiListItemButton-root:hover': {
              bgcolor: 'action.hover',
            },
          }}>
            <ListItemButton selected={tab==='home'} onClick={()=> navigate('/admin')}>
              <ListItemIcon><House size={18} /></ListItemIcon>
              <ListItemText className="label" primary="資訊主頁" />
            </ListItemButton>
            <ListItemButton selected={tab==='users'} onClick={()=> navigate('/admin/users')}>
              <ListItemIcon><Users size={18} /></ListItemIcon>
              <ListItemText className="label" primary="用戶管理" />
            </ListItemButton>
            <ListItemButton selected={tab==='reports'} onClick={()=> navigate('/admin/reports')}>
              <ListItemIcon><Flag size={18} /></ListItemIcon>
              <ListItemText className="label" primary="舉報管理" />
            </ListItemButton>
          </List>
        </Box>
        <Box sx={{ flex: 1, p: 2, pt: '76px', ml: { xs: `${collapsedWidth}px`, lg: `${drawerWidth}px` }, maxWidth: 'none', width: 'auto', m: 0, textAlign: 'left', alignSelf: 'stretch', overflowX: 'auto' }}>
          {tab==='home' && (
            <>
              <Typography sx={{ fontWeight: 800, mb: 1, fontSize: 34 }}>資訊主頁</Typography>
              <HomeStats onLoad={setStats} stats={stats} onNavigate={(path)=> navigate(path)} />
            </>
          )}
          {tab==='users' && (
            <>
              <Typography sx={{ fontWeight: 800, mb: 1, fontSize: 34 }}>用戶列表</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1 }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={usersRoleFilter}
                  onChange={(_, v)=>{ if (v) { setUsersRoleFilter(v); setUsersPage(1); setUserQuery('') } }}
                  sx={{
                    borderRadius: '12px',
                    columnGap: 1,
                    '& .MuiToggleButtonGroup-grouped': {
                      borderRadius: '12px',
                      px: 2,
                      borderColor: 'divider',
                      '&:not(:last-of-type)': { mr: 1 },
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: '#fff',
                        '&:hover': { bgcolor: 'primary.dark' },
                      },
                    },
                  }}
                >
                  <ToggleButton value="all" sx={{ textTransform: 'none', fontWeight: 800 }}>全部</ToggleButton>
                  <ToggleButton value="member" sx={{ textTransform: 'none', fontWeight: 800 }}>會員</ToggleButton>
                  <ToggleButton value="guest" sx={{ textTransform: 'none', fontWeight: 800 }}>訪客</ToggleButton>
                </ToggleButtonGroup>
                {usersRoleFilter === 'guest' && (
                  <TextField
                    size="small"
                    placeholder="搜尋訪客 ID 或名稱"
                    value={userQuery}
                    onChange={(e)=> { setUsersPage(1); setUserQuery(e.target.value) }}
                    sx={{ width: 280 }}
                  />
                )}
              </Box>
              {usersLoading ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>載入中…</Box>
              ) : (
              <TableContainer component={Paper} sx={{ borderRadius: '10px', minWidth: 840, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 840 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>ID</TableCell>
                      <TableCell sx={{ width: 60, whiteSpace: 'nowrap' }}>頭像</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>名稱</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>帳號</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>發布數量</TableCell>
                      <TableCell sx={{ width: 260, whiteSpace: 'nowrap' }}>讚數</TableCell>
                      <TableCell sx={{ width: 220, whiteSpace: 'nowrap' }}>角色</TableCell>
                      <TableCell sx={{ width: 120, whiteSpace: 'nowrap' }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users
                      .map(u => (
                      <TableRow key={u.id} hover>
                      <TableCell sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', maxWidth: 165, minWidth: 165, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {u.id}
                      </TableCell>
                        <TableCell>
                          <Avatar src={u.picture || undefined} sx={{ width: 28, height: 28 }}>
                            {!u.picture && (u.name || 'U').slice(0, 1)}
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          {(u as any).role === 'guest' ? (
                            <span style={{ color: '#0f172a', fontWeight: 700 }}>{u.name || '—'}</span>
                          ) : (
                            <Link
                              to={`/users/${encodeURIComponent(u.id)}`}
                              style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}
                              onMouseEnter={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = 'var(--mui-palette-primary-main, #4f46e5)' }}
                              onMouseLeave={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a' }}
                            >
                              {u.name || '—'}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>{u.email || ((u as any).role === 'guest' ? '—' : '—')}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                            <span>主題數：{(u as any).topicCount ?? (u.topics?.length || 0)}</span>
                            <span>觀點數：{(u as any).pointCount ?? (u.points?.length || 0)}</span>
                            <span>評論數：{(u as any).commentCount ?? (u.comments?.length || 0)}</span>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                            <span>主題讚數：{(u as any).topicLikes || 0}</span>
                            <span>觀點讚數：{(u as any).pointLikes || 0}</span>
                            <span>評論讚數：{(u as any).commentLikes || 0}</span>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {user.role==='superadmin' && (u as any).role !== 'guest' ? (
                            <Select
                              size="small"
                              value={(u as any).role || 'user'}
                              onChange={async (e)=>{
                              const role = e.target.value as string
                              const ok = await confirm({ title: '確認切換角色？' })
                              if (!ok) return
                              await fetch(withBase(`/api/admin/users/${encodeURIComponent(u.id)}/role`), { method: 'PATCH', headers: withAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ role }) })
                              setUsers(prev => prev.map(x => x.id===u.id ? ({ ...x, role }) as any : x))
                              }}
                              sx={{ minWidth: 140, fontSize: 14, '& .MuiSelect-select': { py: 0.5 } }}
                              MenuProps={{ PaperProps: { sx: { fontSize: 14 } } }}
                            >
                            <MenuItem value="user">會員</MenuItem>
                            <MenuItem value="admin">管理者</MenuItem>
                            <MenuItem value="superadmin">超級管理者</MenuItem>
                            </Select>
                          ) : (
                            <span>{(u as any).role==='superadmin'?'超級管理者':((u as any).role==='admin'?'管理者':((u as any).role==='guest'?'訪客':'會員'))}</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {(user.role === 'superadmin' || user.role === 'admin') && u.id !== user.id ? (
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              sx={{ fontWeight: 700, borderRadius: '10px', borderWidth: 1, px: 1.5, py: 0.25 }}
                              onClick={async (e: MouseEvent<HTMLButtonElement>) => {
                                e.preventDefault()
                                const ok = await confirm({ title: '確定刪除此用戶？', body: '用戶的內容將標記為無主，無法復原。' })
                                if (!ok) return
                                const resp = await fetch(withBase(`/api/admin/users/${encodeURIComponent(u.id)}`), { method: 'DELETE', headers: withAuthHeaders({}) })
                                if (!resp.ok && resp.status !== 204) return
                                setUsers((prev) => prev.filter((x) => x.id !== u.id))
                                setUsersTotal((prev) => Math.max(0, prev - 1))
                              }}
                            >
                              刪除
                            </Button>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              )}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Pagination page={usersPage} onChange={(_,p)=> setUsersPage(p)} count={Math.max(1, Math.ceil((usersTotal||0)/pageSize))} size="small" shape="rounded" siblingCount={0} boundaryCount={1} />
              </Box>
            </>
          )}
          {tab==='reports' && (
            <>
              <Typography sx={{ fontWeight: 800, mb: 1, fontSize: 34 }}>舉報列表</Typography>
              <Box sx={{ mb: 1 }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={reportType}
                  onChange={(_, v)=>{ if (v) setReportType(v) }}
                  sx={{
                    borderRadius: '12px',
                    columnGap: 1,
                    '& .MuiToggleButtonGroup-grouped': {
                      borderRadius: '12px',
                      px: 2,
                      borderColor: 'divider',
                      mr: 0,
                      '&:not(:last-of-type)': { mr: 1 },
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: '#fff',
                        '&:hover': { bgcolor: 'primary.dark' },
                      },
                    },
                  }}
                >
                  <ToggleButton value="all">全部</ToggleButton>
                  <ToggleButton value="topic">主題</ToggleButton>
                  <ToggleButton value="point">觀點</ToggleButton>
                  <ToggleButton value="comment">評論</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <TableContainer component={Paper} sx={{ borderRadius: '10px', minWidth: 860, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 860 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.targetId')}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.type')}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.reason')}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.reporter')}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.time')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((r:any)=> (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          {(r.type==='topic' && (r.topicId||r.targetId)) ? (
                            <Link
                              to={`/topics/${encodeURIComponent(r.topicId||r.targetId)}`}
                              style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}
                              onMouseEnter={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = 'var(--mui-palette-primary-main, #4f46e5)' }}
                              onMouseLeave={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a' }}
                            >
                              {r.targetId}
                            </Link>
                          ) : (r.type!=='topic' && r.topicId) ? (
                            <Link
                              to={`/topics/${encodeURIComponent(r.topicId)}`}
                              style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}
                              onMouseEnter={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = 'var(--mui-palette-primary-main, #4f46e5)' }}
                              onMouseLeave={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a' }}
                            >
                              {r.targetId}
                            </Link>
                          ) : (
                            r.targetId
                          )}
                        </TableCell>
                        <TableCell>{r.type==='topic' ? (t('admin.reports.type.topic')) : (r.type==='point' ? (t('admin.reports.type.point')) : (t('admin.reports.type.comment')))}</TableCell>
                        <TableCell sx={{ maxWidth: 320, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{r.reason || '—'}</TableCell>
                        <TableCell>
                          {r.reporter?.id ? (
                            <Link to={`/users/${encodeURIComponent(r.reporter.id)}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}>{r.reporter.name || '用戶'}</Link>
                          ) : (r.reporter?.name || '訪客')}
                        </TableCell>
                        <TableCell>{new Date(r.createdAt).toLocaleString(undefined, { hour12: false })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Pagination page={reportsPage} onChange={(_,p)=> setReportsPage(p)} count={Math.max(1, Math.ceil((reportsTotal||0)/20))} size="small" shape="rounded" siblingCount={0} boundaryCount={1} />
              </Box>
            </>
          )}
          {ConfirmDialogEl}
        </Box>
      </main>
    </div>
  )
}

function HomeStats({ stats, onLoad, onNavigate }: { stats: any, onLoad: (s:any)=>void, onNavigate: (path:string)=>void }) {
  const [points28, setPoints28] = useState<Array<{ date: string; count: number }>>([])
  useEffect(() => {
    (async () => {
      try { const r = await fetch(withBase('/api/admin/stats'), { credentials: 'include', headers: withAuthHeaders({}) }); if (r.ok) { const d = await r.json(); onLoad(d.data) } } catch {}
    })()
    ;(async () => {
      try { const r = await fetch(withBase('/api/admin/stats/points-28d'), { credentials: 'include', headers: withAuthHeaders({}) }); if (r.ok) { const d = await r.json(); setPoints28(d.data||[]) } } catch {}
    })()
  }, [])
  const s = stats || { users: 0, guests: 0, topics: 0, points: 0, comments: 0, reports: 0, dauUsers: 0, dauGuests: 0, dauTotal: 0, mauUsers: 0, mauGuests: 0, mauTotal: 0 }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <StatCard label="用戶數" value={s.users} onClick={()=> onNavigate('/admin/users')} />
        <StatCard label="訪客數" value={s.guests||0} onClick={()=> onNavigate('/admin/guests')} />
        <StatCard label="舉報數" value={s.reports} onClick={()=> onNavigate('/admin/reports')} />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <StatCard label="主題數" value={s.topics} />
        <StatCard label="觀點數" value={s.points} />
        <StatCard label="評論數" value={s.comments} />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <StatCard label="DAU（用戶）" value={s.dauUsers||0} />
        <StatCard label="DAU（訪客）" value={s.dauGuests||0} />
        <StatCard label="DAU（總計）" value={s.dauTotal||0} />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <StatCard label="MAU（用戶）" value={s.mauUsers||0} />
        <StatCard label="MAU（訪客）" value={s.mauGuests||0} />
        <StatCard label="MAU（總計）" value={s.mauTotal||0} />
      </Box>
      <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: 'background.paper' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 1 }}>近 28 天新增觀點數</Typography>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ minWidth: 640 }}>
            {(() => { const maxY = Math.max(5, ...(points28.map(p=>p.count||0))); return (
            <LineChart
              xAxis={[{ scaleType: 'point', data: points28.map(p=>p.date.slice(5)), tickMinStep: 1 }]}
              yAxis={[{ min: 0, max: maxY }]}
              series={[{ data: points28.map(p=>p.count), color: 'var(--mui-palette-primary-main, #4f46e5)' }]}
              height={260}
              margin={{ top: 10, bottom: 24, left: 30, right: 10 }}
            />
            ) })()}
          </div>
        </div>
      </Box>
    </Box>
  )
}

function StatCard({ label, value, onClick }: { label: string; value: number; onClick?: ()=>void }) {
  return (
    <Box onClick={onClick} sx={{ width: { xs: 'auto', lg: 'auto' }, minWidth: 130, border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, textAlign: 'center', bgcolor: 'background.paper', boxShadow: '0 1px 4px rgba(15,35,95,0.06)', cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { boxShadow: '0 4px 14px rgba(15,35,95,0.12)' } : undefined, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
      <Typography sx={{ fontWeight: 900, fontSize: 28, color: 'primary.main', lineHeight: 1 }}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>{label}</Typography>
    </Box>
  )
}
