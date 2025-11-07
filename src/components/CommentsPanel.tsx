import { useEffect, useState } from 'react'
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
import { getJson, type ListResponse, withBase } from '../api/client'

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
  useEffect(() => { if (open) { try { const n = localStorage.getItem('pl:guestName'); if (n) setGuestName(n) } catch {} } }, [open])
  useEffect(() => {
    if (!open) return
    try {
      const map: Record<string, 'up'|'down'> = {}
      for (const c of items) {
        const v = localStorage.getItem(`pl:cv:${c.id}`) as any
        if (v === 'up' || v === 'down') map[c.id] = v
      }
      setVotes((prev) => ({ ...map, ...prev }))
    } catch {}
  }, [open, items])

  async function submit() {
    if (!content.trim()) return
    const parent = replyTo
    const body = { content: content.trim(), parentId: parent ? parent.id : undefined, authorName: guestName?.trim() || undefined, authorType: 'guest' }
    const res = await fetch(withBase(`/api/points/${encodeURIComponent(pointId)}/comments`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const created = await res.json().catch(() => null)
      const createdItem = created?.data as CommentItem | undefined
      setContent('')
      if (guestName?.trim()) { try { localStorage.setItem('pl:guestName', guestName.trim()) } catch {} }
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
          const map: Record<string,string> = { old: t('tabs.old') || '最舊', new: t('tabs.new') || '最新', hot: t('tabs.hot') || '熱門' }
          return map[(v as SortKey) || 'old']
        }}>
          <MenuItem value="old">{t('tabs.old') || '最舊'}</MenuItem>
          <MenuItem value="new">{t('tabs.new') || '最新'}</MenuItem>
          <MenuItem value="hot">{t('tabs.hot') || '熱門'}</MenuItem>
        </Select>
        <Box sx={{ flex: 1 }} />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
        {loading && <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 1 }}>{t('common.loading') || '載入中…'}</Typography>}
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
                <Box component="button" type="button" className="card-action" onClick={() => setReplyTo(c)} sx={{ p: 0, background: 'transparent', border: 'none', color: (t)=>t.palette.primary.main }}>
                  {t('actions.reply') || '回覆'}
                </Box>
              </Box>
              <div style={{ fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap', ...(expandedBody[c.id] ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{c.content}</div>
              {c.content && c.content.length > 80 && (
                <Box
                  component="button"
                  type="button"
                  className="card-action"
                  sx={{ color: (t)=> expandedBody[c.id] ? t.palette.primary.main : t.palette.text.secondary, p: 0, background: 'transparent', border: 'none' }}
                  onClick={() => setExpandedBody((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                >
                  {expandedBody[c.id]
                    ? (t('common.seeLess') || '查看更少')
                    : (t('common.seeMore') || '查看更多')}
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
                      ? (t('actions.hideReplies') || '收合回覆')
                      : ((t('actions.viewRepliesCount') || '{n} replies').replace('{n}', String((c as any).childCount ?? 0)))}
                  </Box>
                </Box>
              )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 72, alignSelf: 'flex-start' }}>
                <IconButton size="small" onClick={async () => {
                  const current = votes[c.id]
                  if (current === 'up') return
                const delta = !current ? +1 : +2
                await fetch(withBase(`/api/comments/${c.id}/vote`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) })
                setVotes(prev => {
                  const next: 'up' = 'up'
                  try { localStorage.setItem(`pl:cv:${c.id}`, next) } catch {}
                  return { ...prev, [c.id]: next }
                })
                setItems(prev => prev.map(it => it.id===c.id?{...it, upvotes: (it.upvotes||0)+delta}:it))
              }}
              sx={(t)=>({
                color: votes[c.id]==='up' ? t.palette.primary.main : undefined,
                '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&.Mui-disabled': { color: votes[c.id]==='up' ? t.palette.primary.main : t.palette.action.disabled },
              })}
              disabled={votes[c.id]==='up'}
              >
                <ThumbsUp size={18} weight={votes[c.id]==='up' ? 'fill' : 'regular'} />
              </IconButton>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{c.upvotes || 0}</Typography>
              <IconButton size="small" onClick={async () => {
                const current = votes[c.id]
                if (current === 'down') return
                const delta = !current ? -1 : -2
                await fetch(withBase(`/api/comments/${c.id}/vote`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) })
                setVotes(prev => {
                  const next: 'down' = 'down'
                  try { localStorage.setItem(`pl:cv:${c.id}`, next) } catch {}
                  return { ...prev, [c.id]: next }
                })
                setItems(prev => prev.map(it => it.id===c.id?{...it, upvotes: (it.upvotes||0)+delta}:it))
              }}
              sx={(t)=>({
                color: votes[c.id]==='down' ? t.palette.primary.main : undefined,
                '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
                '&.Mui-disabled': { color: votes[c.id]==='down' ? t.palette.primary.main : t.palette.action.disabled },
              })}
              disabled={votes[c.id]==='down'}
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
                        <Box component="b" sx={{ color: '#0f172a' }}>{rc.author?.name || '匿名'}</Box>
                        <Box component="span" sx={{ color: (t)=>t.palette.text.secondary, ml: 0.75, fontSize: 12 }}>・ {formatRelativeAgo(rc.createdAt || new Date().toISOString(), locale)}</Box>
                      </Box>
                      <div style={{ fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap', ...(expandedBody[rc.id] ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{rc.content}</div>
                      {rc.content && rc.content.length > 80 && (
                        <Box
                          component="button"
                          type="button"
                          className="card-action"
                          sx={{ color: (t)=> expandedBody[rc.id] ? t.palette.primary.main : t.palette.text.secondary, p: 0, background: 'transparent', border: 'none' }}
                          onClick={() => setExpandedBody((prev) => ({ ...prev, [rc.id]: !prev[rc.id] }))}
                        >
                          {expandedBody[rc.id]
                            ? (t('common.seeLess') || '查看更少')
                            : (t('common.seeMore') || '查看更多')}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 72, alignSelf: 'flex-start' }}>
                      <IconButton size="small" onClick={async () => {
                        const current = votes[rc.id]
                        if (current === 'up') return
                        const delta = !current ? +1 : +2
                        await fetch(withBase(`/api/comments/${rc.id}/vote`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) })
                        setVotes(prev => {
                          const next: 'up' = 'up'
                          try { localStorage.setItem(`pl:cv:${rc.id}`, next) } catch {}
                          return { ...prev, [rc.id]: next }
                        })
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
                        if (current === 'down') return
                        const delta = !current ? -1 : -2
                        await fetch(withBase(`/api/comments/${rc.id}/vote`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) })
                        setVotes(prev => {
                          const next: 'down' = 'down'
                          try { localStorage.setItem(`pl:cv:${rc.id}`, next) } catch {}
                          return { ...prev, [rc.id]: next }
                        })
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
                    }}>{t('common.loadMore') || '查看更多評論'}</button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}

        {(items.length < total) && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <button className="btn btn-sm" onClick={() => load(page + 1, true)}>{t('common.loadMore') || '查看更多評論'}</button>
          </Box>
        )}
      </Box>

      <Box sx={{ pt: 1, position: 'sticky', bottom: 0, bgcolor: 'background.paper' }}>
        {replyTo && (
          <Box sx={{ mb: 0.5, fontSize: 12, color: 'text.secondary' }}>
            {t('actions.replying') || '正在回覆'}{' '}
            <span style={{ color: '#0f172a', fontWeight: 700 }}>
              {replyTo.author?.name || guestName || '匿名'}
            </span>
            {' '}・{' '}
            <button className="card-action" onClick={() => setReplyTo(null)}>{t('actions.cancel') || '取消'}</button>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            value={content}
            onChange={(e)=>setContent(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={1}
            maxRows={6}
            placeholder={t('actions.commentPlaceholder') || '寫下你的評論…'}
          />
          <IconButton
            onClick={submit}
            aria-label="送出"
            sx={(t)=>({
              color: t.palette.primary.main,
              '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
              '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' },
              '&.Mui-disabled': { color: t.palette.action.disabled },
              width: 40, height: 40, borderRadius: '50%'
            })}
          >
            <PaperPlaneRight size={22} weight="fill" />
          </IconButton>
        </Box>
        {!guestName && (
          <Box sx={{ mt: 0.5 }}>
            <TextField value={guestName} onChange={(e)=>setGuestName(e.target.value)} fullWidth size="small" label={t('points.add.nameLabel') || '訪客名稱'} placeholder={t('points.add.namePlaceholder') || '你的名稱'} />
          </Box>
        )}
      </Box>
    </Box>
  )

  return isDrawer ? (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { height: '75vh', borderTopLeftRadius: 12, borderTopRightRadius: 12 } }}>
      {container}
    </Drawer>
  ) : (
    <Dialog open={open} onClose={onClose} fullWidth PaperProps={{ sx: { maxWidth: 576, borderRadius: '10px' } }}>
      {container}
    </Dialog>
  )
}
