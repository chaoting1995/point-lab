import Header from '../components/Header'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { House, Users, Flag, UserCircle } from 'phosphor-react'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { getJson } from '../api/client'
import Avatar from '@mui/material/Avatar'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useAuth from '../auth/AuthContext'
import { withBase } from '../api/client'
import useLanguage from '../i18n/useLanguage'
import GoogleLoginButton from '../components/GoogleLoginButton'
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

type AdminUser = { id: string; name?: string; email?: string; picture?: string; role?: string; topics?: string[]; points?: string[]; comments?: string[] }
type Guest = { id: string; name?: string; posts_topic?: number; posts_point?: number; posts_comment?: number; created_at?: string; last_seen?: string }

// 保留空白區塊供未來擴充（避免未使用警告）

export default function AdminPage() {
  const { t } = useLanguage()
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'home'|'users'|'reports'|'guests'>('home')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState<number>(0)
  const [reports, setReports] = useState<any[]>([])
  const [reportsTotal, setReportsTotal] = useState<number>(0)
  const [guests, setGuests] = useState<Guest[]>([])
  const [guestsTotal, setGuestsTotal] = useState<number>(0)
  const [guestsQuery, setGuestsQuery] = useState('')
  const [reportType, setReportType] = useState<'all'|'topic'|'point'|'comment'>('all')
  const [stats, setStats] = useState<{users:number;topics:number;points:number;comments:number;reports:number} | null>(null)
  const { confirm, ConfirmDialogEl } = useConfirmDialog()
  const pageSize = 20
  const [usersPage, setUsersPage] = useState(1)
  const [reportsPage, setReportsPage] = useState(1)

  useEffect(() => {
    if (tab !== 'users') return
    fetch(withBase(`/api/admin/users?page=${usersPage}&size=${pageSize}`), { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setUsers(d.items||[]); setUsersTotal(d.total||0) })
      .catch(() => { setUsers([]); setUsersTotal(0) })
  }, [tab, usersPage])

  // 路由 -> tab
  useEffect(() => {
    if (location.pathname.startsWith('/admin/users')) setTab('users')
    else if (location.pathname.startsWith('/admin/reports')) setTab('reports')
    else if (location.pathname.startsWith('/admin/guests')) setTab('guests')
    else setTab('home')
    setUsersPage(1)
    setReportsPage(1)
    // reset guests page
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

  // Guests fetch
  useEffect(() => {
    if (tab !== 'guests') return
    const url = `/api/admin/guests?page=${usersPage}&size=${pageSize}&q=${encodeURIComponent(guestsQuery)}`
    fetch(withBase(url), { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setGuests(d.items||[]); setGuestsTotal(d.total||0) })
      .catch(()=> { setGuests([]); setGuestsTotal(0) })
  }, [tab, usersPage, guestsQuery])

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="app">
        <Header />
        <main className="admin__inner" style={{ display: 'flex' }}>
          <Box sx={{ flex: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '96px' }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: '10px', border: '1px solid', borderColor: 'divider', textAlign: 'center', maxWidth: 360 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{t('auth.loginTitle') || '登入'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('auth.loginDesc') || '登入後，可累積數據、參與排名'}</Typography>
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
            <Avatar src={user?.picture || undefined} sx={{ width: { xs: 40, lg: 56 }, height: { xs: 40, lg: 56 }, mx: { xs: 'auto', lg: 0 } }}>{(user?.name||'U').slice(0,1)}</Avatar>
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
            <ListItemButton selected={tab==='guests'} onClick={()=> navigate('/admin/guests')}>
              <ListItemIcon><UserCircle size={18} /></ListItemIcon>
              <ListItemText className="label" primary="訪客管理" />
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
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="搜尋訪客ID或名稱"
                  value={guestsQuery}
                  onChange={(e)=> { setUsersPage(1); setGuestsQuery(e.target.value) }}
                  sx={{ width: 280 }}
                />
              </Box>
              <TableContainer component={Paper} sx={{ borderRadius: '10px', minWidth: 840, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 840 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 60, whiteSpace: 'nowrap' }}>頭像</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>名稱</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>帳號</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>發布數量</TableCell>
                      <TableCell sx={{ width: 260, whiteSpace: 'nowrap' }}>讚數</TableCell>
                      <TableCell sx={{ width: 220, whiteSpace: 'nowrap' }}>角色</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id} hover>
                        <TableCell><Avatar src={u.picture || undefined} sx={{ width: 28, height: 28 }}>{(u.name||'U').slice(0,1)}</Avatar></TableCell>
                        <TableCell>
                          <Link
                            to={`/users/${encodeURIComponent(u.id)}`}
                            style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}
                            onMouseEnter={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = 'var(--mui-palette-primary-main, #4f46e5)' }}
                            onMouseLeave={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a' }}
                          >
                            {u.name || '—'}
                          </Link>
                        </TableCell>
                        <TableCell>{u.email || '—'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                            <span>主題數：{(u.topics?.length||0)}</span>
                            <span>觀點數：{(u.points?.length||0)}</span>
                            <span>評論數：{(u.comments?.length||0)}</span>
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
                          {user.role==='superadmin' ? (
                            <Select size="small" value={(u as any).role || 'user'} onChange={async (e)=>{
                              const role = e.target.value as string
                              const ok = await confirm({ title: '確認切換角色？' })
                              if (!ok) return
                              await fetch(withBase(`/api/admin/users/${encodeURIComponent(u.id)}/role`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
                              setUsers(prev => prev.map(x => x.id===u.id ? ({ ...x, role }) as any : x))
                            }}>
                              <MenuItem value="user">會員</MenuItem>
                              <MenuItem value="admin">管理者</MenuItem>
                              <MenuItem value="superadmin">超級管理者</MenuItem>
                            </Select>
                          ) : (
                            <span>{(u as any).role==='superadmin'?'超級管理者':((u as any).role==='admin'?'管理者':'會員')}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Pagination page={usersPage} onChange={(_,p)=> setUsersPage(p)} count={Math.max(1, Math.ceil((usersTotal||0)/20))} size="small" shape="rounded" siblingCount={0} boundaryCount={1} />
              </Box>
            </>
          )}
          {tab==='guests' && (
            <>
              <Typography sx={{ fontWeight: 800, mb: 1, fontSize: 34 }}>訪客管理</Typography>
              <TableContainer component={Paper} sx={{ borderRadius: '10px', minWidth: 840, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 840 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>訪客ID</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>名稱</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>主題數</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>觀點數</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>評論數</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>最後出現</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {guests.map(g => (
                      <TableRow key={g.id} hover>
                        <TableCell>{g.id}</TableCell>
                        <TableCell>{g.name || '—'}</TableCell>
                        <TableCell>{g.posts_topic || 0}</TableCell>
                        <TableCell>{g.posts_point || 0}</TableCell>
                        <TableCell>{g.posts_comment || 0}</TableCell>
                        <TableCell>{new Date(g.last_seen || g.created_at || '').toLocaleString(undefined, { hour12: false })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Pagination page={usersPage} onChange={(_,p)=> setUsersPage(p)} count={Math.max(1, Math.ceil((guestsTotal||0)/pageSize))} size="small" shape="rounded" siblingCount={0} boundaryCount={1} />
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
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.targetId') || '目標ID'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.type') || '類型'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.reason') || '舉報原因'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.reporter') || '舉報人'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('admin.reports.headers.time') || '時間'}</TableCell>
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
                        <TableCell>{r.type==='topic' ? (t('admin.reports.type.topic')||'主題') : (r.type==='point' ? (t('admin.reports.type.point')||'觀點') : (t('admin.reports.type.comment')||'評論'))}</TableCell>
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
  useEffect(() => {
    (async () => {
      try { const r = await fetch(withBase('/api/admin/stats'), { credentials: 'include' }); if (r.ok) { const d = await r.json(); onLoad(d.data) } } catch {}
    })()
  }, [])
  const s = stats || { users: 0, guests: 0, topics: 0, points: 0, comments: 0, reports: 0 }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <StatCard label="用戶數" value={s.users} onClick={()=> onNavigate('/admin/users')} />
        <StatCard label="訪客數" value={s.guests||0} onClick={()=> onNavigate('/admin/guests')} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        <StatCard label="主題數" value={s.topics} onClick={()=> onNavigate('/topics')} />
        <StatCard label="觀點數" value={s.points} onClick={()=> onNavigate('/topics')} />
        <StatCard label="評論數" value={s.comments} onClick={()=> onNavigate('/topics')} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <StatCard label="舉報數" value={s.reports} onClick={()=> onNavigate('/admin/reports')} />
      </Box>
    </Box>
  )
}

function StatCard({ label, value, onClick }: { label: string; value: number; onClick?: ()=>void }) {
  return (
    <Box onClick={onClick} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, textAlign: 'center', bgcolor: 'background.paper', boxShadow: '0 1px 4px rgba(15,35,95,0.06)', cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { boxShadow: '0 4px 14px rgba(15,35,95,0.12)' } : undefined, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
      <Typography sx={{ fontWeight: 900, fontSize: 28, color: 'primary.main', lineHeight: 1 }}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>{label}</Typography>
    </Box>
  )
}
