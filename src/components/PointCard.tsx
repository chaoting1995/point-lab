import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { ThumbsUp, ThumbsDown, ShareNetwork } from 'phosphor-react'
import type { Point } from '../data/points'
import useLanguage from '../i18n/useLanguage'
import { formatRelativeAgo } from '../utils/text'
import useConfirmDialog from '../hooks/useConfirmDialog'

export default function PointCard({ point, onDeleted }: { point: Point; onDeleted?: (id: string) => void }) {
  const { t, locale } = useLanguage()
  const [score, setScore] = useState<number>(point.upvotes ?? 0)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showToggle, setShowToggle] = useState(false)
  const descRef = useRef<HTMLParagraphElement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { confirm, ConfirmDialogEl } = useConfirmDialog()
  const bgColor = point.position === 'agree'
    ? 'rgba(16, 185, 129, 0.08)'
    : point.position === 'others'
    ? 'rgba(239, 68, 68, 0.08)'
    : 'background.paper'

  async function vote(delta: 1 | -1) {
    if (busy) return
    try {
      setBusy(true)
      setScore((s) => s + delta)
    } finally {
      setBusy(false)
    }
  }

  const createdLabel = useMemo(() => formatRelativeAgo(point.createdAt, locale), [point.createdAt, locale])
  const authorName = point.author?.name || '匿名'

  async function remove() {
    if (deleting) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/points/${point.id}`, { method: 'DELETE' })
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
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--mui-palette-primary-main, #4f46e5)',
                    fontSize: 12,
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {expanded ? (t('common.seeLess') || '查看更少') : (t('common.seeMore') || '查看更多')}
                </button>
              </Box>
            )}
            <Typography component="div" variant="caption" sx={{ color: 'text.secondary', fontSize: 12, mt: 'auto' }}>
              {authorName} | {createdLabel} | {point.comments ?? 0} 則評論 | 報告 | {t('actions.share')}
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
            </Typography>
            {ConfirmDialogEl}
          </Box>

          {/* 右欄：投票垂直區 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" aria-label="讚" onClick={() => vote(1)} disabled={busy} sx={{ borderRadius: '10px' }}>
              <ThumbsUp size={16} weight="bold" />
            </IconButton>
            <Typography variant="subtitle2" sx={{ minWidth: 16, textAlign: 'center', fontWeight: 800 }}>
              {score}
            </Typography>
            <IconButton size="small" aria-label="倒讚" onClick={() => vote(-1)} disabled={busy} sx={{ borderRadius: '10px' }}>
              <ThumbsDown size={16} weight="bold" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
