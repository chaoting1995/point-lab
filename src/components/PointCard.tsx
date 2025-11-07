import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { ThumbsUp, ThumbsDown } from 'phosphor-react'
import type { Point } from '../data/points'
import useLanguage from '../i18n/useLanguage'
import { formatRelativeAgo } from '../utils/text'
import useConfirmDialog from '../hooks/useConfirmDialog'
import usePromptDialog from '../hooks/usePromptDialog'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { withBase } from '../api/client'
import CommentsPanel from './CommentsPanel'
import useAuth from '../auth/AuthContext'

export default function PointCard({ point, onDeleted }: { point: Point; onDeleted?: (id: string) => void }) {
  const { t, locale } = useLanguage()
  const [score, setScore] = useState<number>(point.upvotes ?? 0)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showToggle, setShowToggle] = useState(false)
  const descRef = useRef<HTMLParagraphElement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { confirm, ConfirmDialogEl } = useConfirmDialog()
  const { prompt, PromptDialogEl } = usePromptDialog()
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'superadmin'
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [snack, setSnack] = useState<{open:boolean; msg:string}>({ open: false, msg: '' })
  const bgColor = point.position === 'agree'
    ? 'rgba(16, 185, 129, 0.08)'
    : point.position === 'others'
    ? 'rgba(239, 68, 68, 0.08)'
    : 'background.paper'

  const [voteState, setVoteState] = useState<'up'|'down'|undefined>(undefined)
  useEffect(() => { try { const v = localStorage.getItem(`pl:pv:${point.id}`) as any; if (v==='up'||v==='down') setVoteState(v) } catch {} }, [point.id])
  async function voteDir(dir:'up'|'down') {
    if (busy) return
    setBusy(true)
    const current = voteState
    if (current === dir) { setBusy(false); return }
    const delta = !current ? (dir==='up'?+1:-1) : (dir==='up'?+2:-2)
    try {
      setScore((s)=> (s||0)+delta)
      const res = await fetch(withBase(`/api/points/${point.id}/vote`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) })
      if (!res.ok) throw new Error('VOTE_FAILED')
      const data = await res.json().catch(()=>null)
      const serverScore = typeof data?.data?.upvotes === 'number' ? data.data.upvotes : undefined
      if (typeof serverScore === 'number') setScore(serverScore)
      const next = dir
      setVoteState(next)
      try { localStorage.setItem(`pl:pv:${point.id}`, next) } catch {}
    } catch {
      setScore((s)=> (s||0)-delta)
    } finally {
      setBusy(false)
    }
  }

  const createdLabel = useMemo(() => {
    const ts = point.createdAt || new Date().toISOString()
    return formatRelativeAgo(ts, locale)
  }, [point.createdAt, locale])
  const authorName = point.author?.name || '匿名'

  async function remove() {
    if (deleting) return
    try {
      setDeleting(true)
      const res = await fetch(withBase(`/api/points/${point.id}`), { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('DELETE_FAILED')
      onDeleted?.(point.id)
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    const el = descRef.current
    if (!el) return
    const style = window.getComputedStyle(el)
    const lineHeight = parseFloat(style.lineHeight || '20') || 20
    const twoLineHeight = lineHeight * 2
    // 建立不裁切的隱藏節點以測量完整高度
    const rect = el.getBoundingClientRect()
    const probe = document.createElement('div')
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.width = rect.width + 'px'
    probe.style.font = style.font
    probe.style.whiteSpace = 'pre-wrap'
    probe.style.lineHeight = style.lineHeight
    probe.style.letterSpacing = style.letterSpacing
    probe.style.wordBreak = 'break-word'
    probe.textContent = point.description || ''
    document.body.appendChild(probe)
    const full = probe.getBoundingClientRect().height
    document.body.removeChild(probe)
    setShowToggle(full > twoLineHeight + 1)
  }, [point.description])

  return (
    <>
    <Card
      elevation={0}
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor:
          point.position === 'agree'
            ? 'rgba(16, 185, 129, 0.25)'
            : point.position === 'others'
            ? 'rgba(239, 68, 68, 0.25)'
            : 'divider',
        bgcolor: bgColor,
        boxShadow: '0 1px 4px rgba(15,35,95,0.06)',
        transition: 'box-shadow .2s ease',
        '&:hover': { boxShadow: '0 4px 14px rgba(15,35,95,0.12)' },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 2 }}>
          {/* 左欄：描述（唯一內容） + 附加資訊列 */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Typography
              ref={descRef}
              variant="body1"
              sx={{
                m: 0,
                whiteSpace: 'pre-wrap',
                ...(expanded
                  ? {}
                  : {
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }),
              }}
            >
              {point.description}
            </Typography>
            {showToggle && (
              <Box sx={{ mt: 0.5 }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  sx={(t)=>({
                    border: 'none',
                    background: 'transparent',
                    color: t.palette.primary.main,
                    fontSize: 12,
                    p: 0,
                    cursor: 'pointer',
                  })}
                >
                  {expanded ? (t('common.seeLess') || '查看更少') : (t('common.seeMore') || '查看更多')}
                </Box>
              </Box>
            )}
            <Typography component="div" variant="caption" sx={{ color: 'text.secondary', fontSize: 12, mt: 'auto' }}>
              {point.userId ? (
                <a href={`/users/${encodeURIComponent(point.userId)}`} className="card-action" style={{ fontWeight: 700, textDecoration: 'none' }}>{authorName}</a>
              ) : (
                authorName
              )}
              {' '}| {createdLabel} | <button type="button" className="card-action" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCommentsOpen(true) }}>{(t('common.counts.comments') || '{n} 則評論').replace('{n}', String(point.comments ?? 0))}</button> | <button type="button" className="card-action" onClick={async (e)=>{ e.preventDefault(); e.stopPropagation(); const reason = await prompt({ title: '確定舉報？', label: '舉報原因（可選）', placeholder: '請補充原因（可留空）', confirmText: '送出', cancelText: '取消' }); if (reason !== null) { try { const r = await fetch(withBase('/api/reports'), { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ type: 'point', targetId: point.id, reason: (reason||'').trim() || undefined }) }); if (r.ok) setSnack({ open: true, msg: '已送出舉報' }) } catch {} } }}>{t('actions.report') || '報告'}</button>
              {canManage && (<>
              {' '}|{' '}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); const q = point.topicId ? `?topic=${encodeURIComponent(point.topicId)}` : ''; window.location.assign(`/points/edit/${encodeURIComponent(point.id)}${q}`) }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onMouseUp={(e) => { e.preventDefault(); e.stopPropagation() }}
                className="card-action"
              >
                {t('common.edit') || '編輯'}
              </button>
              {' '}|{' '}
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const ok = await confirm({ title: '確定刪除？' })
                  if (ok) remove()
                }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onMouseUp={(e) => { e.preventDefault(); e.stopPropagation() }}
                disabled={deleting}
                className="card-action"
              >
                {t('common.delete') || '刪除'}
              </button>
              </>)}
            </Typography>
            {ConfirmDialogEl}
          </Box>

          {/* 右欄：投票垂直區 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <span role="presentation" onMouseDown={(e)=>e.stopPropagation()} onClick={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()} style={{ display: 'inline-flex' }}>
            <IconButton
              size="small"
              aria-label="讚"
              onClick={(e) => { e.stopPropagation(); voteDir('up') }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              disabled={busy || voteState==='up'}
              sx={(t)=>({ borderRadius: '10px', color: voteState==='up' ? t.palette.primary.main : undefined, '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' }, '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' }, '&.Mui-disabled': { color: voteState==='up' ? t.palette.primary.main : t.palette.action.disabled } })}
            >
              <ThumbsUp size={18} weight={voteState==='up' ? 'fill' : 'regular'} />
            </IconButton>
            </span>
            <Typography variant="subtitle2" sx={{ minWidth: 16, textAlign: 'center', fontWeight: 800 }}>
              {score}
            </Typography>
            <span role="presentation" onMouseDown={(e)=>e.stopPropagation()} onClick={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()} style={{ display: 'inline-flex' }}>
            <IconButton
              size="small"
              aria-label="倒讚"
              onClick={(e) => { e.stopPropagation(); voteDir('down') }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              disabled={busy || voteState==='down'}
              sx={(t)=>({ borderRadius: '10px', color: voteState==='down' ? t.palette.primary.main : undefined, '&:hover': { color: t.palette.primary.dark, backgroundColor: 'transparent' }, '&:active': { color: t.palette.primary.dark, backgroundColor: 'transparent' }, '&.Mui-disabled': { color: voteState==='down' ? t.palette.primary.main : t.palette.action.disabled } })}
            >
              <ThumbsDown size={18} weight={voteState==='down' ? 'fill' : 'regular'} />
            </IconButton>
            </span>
          </Box>
        </Box>
      </CardContent>
    </Card>
    <CommentsPanel open={commentsOpen} onClose={() => setCommentsOpen(false)} pointId={point.id} />
    <Snackbar open={snack.open} autoHideDuration={2000} onClose={()=> setSnack({ open:false, msg:'' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={()=> setSnack({ open:false, msg:'' })} severity="success" sx={{ width: '100%' }}>{snack.msg || '已送出'}</Alert>
    </Snackbar>
    {PromptDialogEl}
    </>
  )
}
