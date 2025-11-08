import { useEffect, useState, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ThumbsUp, ThumbsDown, CaretDown, PaperPlaneRight } from 'phosphor-react'
// theme colors are accessed via sx={(t)=>...} or CSS vars like var(--mui-palette-*)
import useLanguage from '../i18n/useLanguage'
import { formatRelativeAgo } from '../utils/text'
import { getJson, type ListResponse, withAuthHeaders, withBase } from '../api/client'
import useAuth from '../auth/AuthContext'
import usePromptDialog from '../hooks/usePromptDialog'
import { getVoteState as getStoredVote, setVoteState as setStoredVote } from '../utils/votes'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { getOrCreateGuestId, saveGuestName } from '../utils/guest'

type SortKey = 'old' | 'new' | 'hot'

export type CommentItem = {
  id: string
  pointId: string
  parentId?: string
  content: string
  upvotes?: number
  createdAt?: string
  author?: { name: string; role?: string }
}

function useViewport() {
  const [w, setW] = useState<number>(typeof window === 'undefined' ? 1024 : window.innerWidth)
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

export default function CommentsPanel({ open, onClose, pointId }: { open: boolean; onClose: () => void; pointId: string }) {
  const { t, locale } = useLanguage()
  const { user } = useAuth()
  const width = useViewport()
  const isDrawer = width < 756
  const [sort, setSort] = useState<SortKey>('old')
  const [items, setItems] = useState<CommentItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null)
  const [content, setContent] = useState('')
  type ChildState = { items: CommentItem[]; page: number; total: number } | undefined
  const [expanded, setExpanded] = useState<Record<string, ChildState>>({})
  const [guestName, setGuestName] = useState<string>('')
  const [votes, setVotes] = useState<Record<string, 'up' | 'down' | undefined>>({})
  const [expandedBody, setExpandedBody] = useState<Record<string, boolean>>({})
  const { prompt, PromptDialogEl } = usePromptDialog()
  const [snack, setSnack] = useState<{open:boolean; msg:string}>({ open: false, msg: '' })
  // 內容是否被截斷（用於決定是否顯示「查看更多」）
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const childContentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [overflow, setOverflow] = useState<Record<string, boolean>>({})
  const [childOverflow, setChildOverflow] = useState<Record<string, boolean>>({})

  async function load(p = 1, append = false) {
    setLoading(true)
    try {
      // 永遠載入頂層列表；回覆模式僅影響輸入區，不影響清單顯示
      const resp = await getJson<ListResponse<CommentItem>>(`/api/points/${encodeURIComponent(pointId)}/comments?sort=${sort}&page=${p}&size=10`)
      setTotal(resp.total || 0)
      setPage(p)
      setItems(append ? [...items, ...resp.items] : resp.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (open) load(1, false) }, [open, sort])
  // 計算哪些內容實際被三行截斷（決定是否顯示「查看更多」）
  useEffect(() => {
    const m: Record<string, boolean> = {}
    for (const it of items) {
      const el = contentRefs.current[it.id]
      if (el && !expandedBody[it.id]) {
        m[it.id] = (el.scrollHeight - 1) > el.clientHeight
      } else {
        m[it.id] = false
      }
    }
    setOverflow(m)
  }, [items, expandedBody])
  useEffect(() => { if (open) { try { const raw = localStorage.getItem('pl:guest'); if (raw) { const n = (JSON.parse(raw)||{}).name; if (n) setGuestName(n) } } catch {} } }, [open])
  useEffect(() => {
    if (!open) return
    try {
      const map: Record<string, 'up'|'down'> = {}
      for (const c of items) {
        const v = getStoredVote('comment', c.id)
        if (v) map[c.id] = v
      }
      setVotes((prev) => ({ ...map, ...prev }))
    } catch {}
  }, [open, items])

  // 計算子留言是否溢出
  useEffect(() => {
    const cm: Record<string, boolean> = {}
    const cur = expanded
    for (const key of Object.keys(cur)) {
      const group = cur[key]
      if (!group) continue
      for (const it of group.items) {
        const el = childContentRefs.current[it.id]
        if (el && !expandedBody[it.id]) {
          cm[it.id] = (el.scrollHeight - 1) > el.clientHeight
        } else {
          cm[it.id] = false
        }
      }
    }
    setChildOverflow(cm)
  }, [expanded, expandedBody])

  async function submit() {
    if (!content.trim()) return
    const parent = replyTo
    const isMember = !!user
    const body = {
      content: content.trim(),
      parentId: parent ? parent.id : undefined,
      authorName: isMember ? undefined : (guestName?.trim() || undefined),
      authorType: isMember ? 'user' : 'guest',
      ...(isMember ? {} : { guestId: getOrCreateGuestId() }),
    }
    const res = await fetch(withBase(`/api/points/${encodeURIComponent(pointId)}/comments`), { method: 'POST', headers: withAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify(body) })
    if (res.ok) {
      const created = await res.json().catch(() => null)
      const createdItem = created?.data as CommentItem | undefined
      try { if (!user) { const id = createdItem?.id; if (id) { const mod = await import('../utils/guestActivity'); (mod as any).addGuestItem?.('comment', id) } } } catch {}
      setContent('')
      if (guestName?.trim()) { try { saveGuestName(guestName.trim()) } catch {} }
      // 若是針對某一則一級評論的回覆，確保該父層展開並立即看到新留言
      if (parent && createdItem) {
        setExpanded((prev) => {
          const cur = prev[parent.id]
          const items = cur ? [createdItem, ...cur.items] : [createdItem]
          return { ...prev, [parent.id]: { items, page: 1, total: (cur?.total || 0) + 1 } }
        })
        // 同步增加父層的 childCount，避免重載前數字不正確
        setItems((prev) => prev.map((it) => (it.id === parent.id ? ({ ...(it as any), childCount: (((it as any).childCount) || 0) + 1 }) : it)))
      }
      setReplyTo(null)
      await load(1, false)
    }
  }

  const container = (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Select size="small" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} displayEmpty renderValue={(v)=>{
          const map: Record<string,string> = { old: t('tabs.old'), new: t('tabs.new'), hot: t('tabs.hot') }
          return map[(v as SortKey) || 'old']
        }}>
          <MenuItem value="old">{t('tabs.old')}</MenuItem>
          <MenuItem value="new">{t('tabs.new')}</MenuItem>
          <MenuItem value="hot">{t('tabs.hot')}</MenuItem>
        </Select>
        <Box sx={{ flex: 1 }} />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
        {loading && <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 1 }}>{t('common.loading')}</Typography>}
        {items.map((c) => (
          <Box key={c.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
              <Box sx={{ fontSize: 14 }}>
                <Box component="b" sx={{ color: '#0f172a' }}>{c.author?.name || '匿名'}</Box>
                <Box component="span" sx={{ color: (t)=>t.palette.text.secondary, m: 0, fontSize: 12 }}>
                  ・ {formatRelativeAgo(c.createdAt || new Date().toISOString(), locale)}
                </Box>
                <Box component="span" sx={{ m: 0, color: (t)=>t.palette.text.secondary }}>・</Box>
                <Box component="button" type="button" className="card-action" onClick={async (e)=>{ e.preventDefault(); e.stopPropagation(); const reason = await prompt({ title: '確定舉報？', label: '舉報原因（可選）', placeholder: '請補充原因（可留空）', confirmText: '送出', cancelText: '取消' }); if (reason !== null) { try { const r = await fetch(withBase('/api/reports'), { method:'POST', headers: withAuthHeaders({ 'Content-Type':'application/json' }), credentials: 'include', body: JSON.stringify({ type: 'comment', targetId: c.id, reason: (reason||'').trim() || undefined }) }); if (r.ok) setSnack({ open: true, msg: '已送出舉報' }) } catch {} } }} sx={{ p: 0, background: 'transparent', border: 'none', color: (t)=>t.palette.primary.main }}>
                  {t('actions.report')}
                </Box>
                <Box component="span" sx={{ m: 0, color: (t)=>t.palette.text.secondary }}>・</Box>
                <Box component="button" type="button" className="card-action" onClick={() => setReplyTo(c)} sx={{ p: 0, background: 'transparent', border: 'none', color: (t)=>t.palette.primary.main }}>
                  {t('actions.reply')}
                </Box>
              </Box>
              <div ref={(el)=>{ contentRefs.current[c.id]=el }} style={{ fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', ...(expandedBody[c.id] ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{c.content}</div>
              {overflow[c.id] && !expandedBody[c.id] && (
                <Box
                  component="button"
                  type="button"
                  className="card-action"
                  sx={{ color: (t)=> expandedBody[c.id] ? t.palette.primary.main : t.palette.text.secondary, p: 0, background: 'transparent', border: 'none' }}
                  onClick={() => setExpandedBody((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                >
                  {expandedBody[c.id]
                    ? (t('common.seeLess'))
                    : (t('common.seeMore'))}
                </Box>
              )}
              {/* 二級回覆展開開關（仍置於第一列左區）*/}
              {(!replyTo && (c as any).childCount > 0) && (
                <Box sx={{ mt: 0.5 }}>
                  <Box component="button" className="card-action" sx={{ color: (t)=>t.palette.text.secondary, display: 'inline-flex', alignItems: 'center', gap: 1, p: 0, background: 'transparent', border: 'none' }} onClick={async () => {
                    if (!expanded[c.id]) {
                      const resp = await getJson<ListResponse<CommentItem>>(`/api/points/${encodeURIComponent(pointId)}/comments?sort=old&page=1&size=10&parent=${encodeURIComponent(c.id)}`)
                      setExpanded(prev => ({ ...prev, [c.id]: { items: resp.items, page: 1, total: resp.total || resp.items.length } }))
                    } else {
                      setExpanded(prev => ({ ...prev, [c.id]: undefined }))
                    }
                  }}>
                    <CaretDown size={14} /> {expanded[c.id]
                      ? (t('actions.hideReplies'))
                      : ((t('actions.viewRepliesCount')).replace('{n}', String((c as any).childCount ?? 0)))}
                  </Box>
                </Box>
              )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 72, alignSelf: 'flex-start' }}>
                <IconButton size="small" onClick={async () => {
                  const current = votes[c.id]
                  const target = current==='up' ? undefined : 'up'
                  const { next, delta } = setStoredVote('comment', c.id, target)
                  if (delta === 0) return
                  await fetch(withBase(`/api/comments/${c.id}/vote`), { method: 'PATCH', headers: withAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ delta }) })
                  setVotes(prev => ({ ...prev, [c.id]: next }))
                  setItems(prev => prev.map(it => it.id===c.id?{...it, upvotes: (it.upvotes||0)+delta}:it))
              }}
              sx={(t)=>({
                color: votes[c.id]==='up' ? t.palette.primary.main : undefined,
                '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&.Mui-disabled': { color: votes[c.id]==='up' ? t.palette.primary.main : t.palette.action.disabled },
              })}
              disabled={false}
              >
                <ThumbsUp size={18} weight={votes[c.id]==='up' ? 'fill' : 'regular'} />
              </IconButton>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{c.upvotes || 0}</Typography>
              <IconButton size="small" onClick={async () => {
                const current = votes[c.id]
                const target = current==='down' ? undefined : 'down'
                const { next, delta } = setStoredVote('comment', c.id, target)
                if (delta === 0) return
                await fetch(withBase(`/api/comments/${c.id}/vote`), { method: 'PATCH', headers: withAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ delta }) })
                setVotes(prev => ({ ...prev, [c.id]: next }))
                setItems(prev => prev.map(it => it.id===c.id?{...it, upvotes: (it.upvotes||0)+delta}:it))
              }}
              sx={(t)=>({
                color: votes[c.id]==='down' ? t.palette.primary.main : undefined,
                '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&.Mui-disabled': { color: votes[c.id]==='down' ? t.palette.primary.main : t.palette.action.disabled },
              })}
              disabled={false}
              >
                <ThumbsDown size={18} weight={votes[c.id]==='down' ? 'fill' : 'regular'} />
              </IconButton>
            </Box>
            </Box>

            {/* 第二列：二級回覆列表（寬度 90%，靠右） */}
            {expanded[c.id] && (
              <Box sx={(t)=>({ mt: 1, width: '90%', ml: 'auto', pl: 2, borderLeft: '2px solid', borderColor: t.palette.divider })}>
                {expanded[c.id]!.items.map(rc => (
                  <Box key={rc.id} sx={{ display: 'flex', gap: 1.5, py: 0.75 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ fontSize: 14 }}>
                        { (rc as any).author?.id ? (
                          <a href={`/users/${encodeURIComponent((rc as any).author.id)}`} className="card-action" style={{ fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>{rc.author?.name || '匿名'}</a>
                        ) : (
                          <Box component="b" sx={{ color: '#0f172a' }}>{rc.author?.name || '匿名'}</Box>
                        )}
                        <Box component="span" sx={{ color: (t)=>t.palette.text.secondary, ml: 0.75, fontSize: 12 }}>・ {formatRelativeAgo(rc.createdAt || new Date().toISOString(), locale)}</Box>
                      </Box>
                      <div ref={(el)=>{ childContentRefs.current[rc.id]=el }} style={{ fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', ...(expandedBody[rc.id] ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{rc.content}</div>
                      {childOverflow[rc.id] && !expandedBody[rc.id] && (
                        <Box
                          component="button"
                          type="button"
                          className="card-action"
                          sx={{ color: (t)=> expandedBody[rc.id] ? t.palette.primary.main : t.palette.text.secondary, p: 0, background: 'transparent', border: 'none' }}
                          onClick={() => setExpandedBody((prev) => ({ ...prev, [rc.id]: !prev[rc.id] }))}
                        >
                          {expandedBody[rc.id]
                            ? (t('common.seeLess'))
                            : (t('common.seeMore'))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 72, alignSelf: 'flex-start' }}>
                      <IconButton size="small" onClick={async () => {
                        const current = votes[rc.id]
                        const target = current==='up' ? undefined : 'up'
                        const { next, delta } = setStoredVote('comment', rc.id, target)
                        if (delta === 0) return
                        await fetch(withBase(`/api/comments/${rc.id}/vote`), { method: 'PATCH', headers: withAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ delta }) })
                        setVotes(prev => ({ ...prev, [rc.id]: next }))
                        setExpanded(prev => ({ ...prev, [c.id]: { ...prev[c.id]!, items: prev[c.id]!.items.map(x => x.id===rc.id?{...x, upvotes: (x.upvotes||0)+delta}:x) } }))
                      }}
                      sx={(t)=>({
                        color: votes[rc.id]==='up' ? t.palette.primary.main : undefined,
                        '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                        '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                        '&.Mui-disabled': { color: votes[rc.id]==='up' ? t.palette.primary.main : t.palette.action.disabled },
                      })}
                      disabled={votes[rc.id]==='up'}
                      >
                        <ThumbsUp size={18} weight={votes[rc.id]==='up' ? 'fill' : 'regular'} />
                      </IconButton>
                      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{rc.upvotes || 0}</Typography>
                      <IconButton size="small" onClick={async () => {
                        const current = votes[rc.id]
                        const target = current==='down' ? undefined : 'down'
                        const { next, delta } = setStoredVote('comment', rc.id, target)
                        if (delta === 0) return
                        await fetch(withBase(`/api/comments/${rc.id}/vote`), { method: 'PATCH', headers: withAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ delta }) })
                        setVotes(prev => ({ ...prev, [rc.id]: next }))
                        setExpanded(prev => ({ ...prev, [c.id]: { ...prev[c.id]!, items: prev[c.id]!.items.map(x => x.id===rc.id?{...x, upvotes: (x.upvotes||0)+delta}:x) } }))
                      }}
                      sx={(t)=>({
                        color: votes[rc.id]==='down' ? t.palette.primary.main : undefined,
                        '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                        '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                        '&.Mui-disabled': { color: votes[rc.id]==='down' ? t.palette.primary.main : t.palette.action.disabled },
                      })}
                      disabled={votes[rc.id]==='down'}
                      >
                        <ThumbsDown size={18} weight={votes[rc.id]==='down' ? 'fill' : 'regular'} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
                {expanded[c.id]!.items.length < (expanded[c.id]!.total || 0) && (
                  <Box sx={{ textAlign: 'center', py: 0.5 }}>
                    <button className="btn btn-xs" onClick={async () => {
                      const nextPage = expanded[c.id]!.page + 1
                      const resp = await getJson<ListResponse<CommentItem>>(`/api/points/${encodeURIComponent(pointId)}/comments?sort=old&page=${nextPage}&size=10&parent=${encodeURIComponent(c.id)}`)
                      setExpanded(prev => ({ ...prev, [c.id]: { items: [...prev[c.id]!.items, ...resp.items], page: nextPage, total: resp.total || prev[c.id]!.total } }))
                    }}>{t('common.loadMore')}</button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}

        {(items.length < total) && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <button className="btn btn-sm" onClick={() => load(page + 1, true)}>{t('common.loadMore')}</button>
          </Box>
        )}
      </Box>

      <Box sx={{ pt: 1, mt: 'auto', bgcolor: 'background.paper' }}>
        {replyTo && (
          <Box sx={{ mb: 0.5, fontSize: 12, color: 'text.secondary' }}>
            {t('actions.replying')}{' '}
            <span style={{ color: '#0f172a', fontWeight: 700 }}>
              {replyTo.author?.name || guestName || '匿名'}
            </span>
            {' '}・{' '}
            <button className="card-action" onClick={() => setReplyTo(null)}>{t('actions.cancel')}</button>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            value={content}
            onChange={(e)=>setContent(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={1}
            maxRows={6}
            placeholder={t('actions.commentPlaceholder')}
          />
          <IconButton
            onClick={submit}
            aria-label="送出"
            sx={(t)=>({
              color: t.palette.primary.main,
              '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
              '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
              '&.Mui-disabled': { color: t.palette.action.disabled },
              width: 40, height: 40, borderRadius: '50%', alignSelf: 'flex-end'
            })}
          >
            <PaperPlaneRight size={22} weight="fill" />
          </IconButton>
        </Box>
        {!user && !guestName && (
          <Box sx={{ mt: 0.5 }}>
            <TextField value={guestName} onChange={(e)=>setGuestName(e.target.value)} fullWidth size="small" label={t('points.add.nameLabel')} placeholder={t('points.add.namePlaceholder')} />
          </Box>
        )}
      </Box>
    {PromptDialogEl}
    <Snackbar open={snack.open} autoHideDuration={2000} onClose={()=> setSnack({ open:false, msg:'' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={()=> setSnack({ open:false, msg:'' })} severity="success" sx={{ width: '100%' }}>{snack.msg || '已送出'}</Alert>
    </Snackbar>
    </Box>
  )

  return isDrawer ? (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onClick={(e)=> e.stopPropagation()}
      PaperProps={{ sx: { height: '75vh', borderTopLeftRadius: 12, borderTopRightRadius: 12 } }}
      ModalProps={{ keepMounted: true }}
    >
      {container}
    </Drawer>
  ) : (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      onClick={(e)=> e.stopPropagation()}
      PaperProps={{ sx: { maxWidth: 576, height: '75vh', display: 'flex', borderRadius: '10px' } }}
    >
      {container}
    </Dialog>
  )
}
