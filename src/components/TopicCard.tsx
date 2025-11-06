import { Link } from 'react-router-dom'
import type { Topic } from '../data/topics'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { ThumbsUp, ThumbsDown } from 'phosphor-react'
import { useState } from 'react'
import useLanguage from '../i18n/useLanguage'
import { formatRelativeAgo } from '../utils/text'
import useConfirmDialog from '../hooks/useConfirmDialog'

export default function TopicCard({ topic, onDeleted, showMeta = true, showVote = true }: { topic: Topic; onDeleted?: (id: string) => void; showMeta?: boolean; showVote?: boolean }) {
  const [score, setScore] = useState<number>(typeof topic.score === 'number' ? topic.score : 0)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { locale, t } = useLanguage()
  const createdLabel = formatRelativeAgo(topic.createdAt || new Date().toISOString(), locale)
  const { confirm, ConfirmDialogEl } = useConfirmDialog()
  const [confirming, setConfirming] = useState(false)
  async function remove() {
    if (deleting) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/topics/${topic.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('DELETE_FAILED')
      onDeleted?.(topic.id)
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }
  async function vote(delta: 1 | -1) {
    if (busy) return
    try {
      setBusy(true)
      setScore((s) => s + delta)
      const res = await fetch(`/api/topics/${topic.id}/vote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      if (!res.ok) throw new Error('VOTE_FAILED')
      const data = await res.json()
      setScore(typeof data?.data?.score === 'number' ? data.data.score : 0)
    } catch {
      // rollback on error
      setScore((s) => s - delta)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 4px rgba(15,35,95,0.06)',
        transition: 'box-shadow .2s ease',
        '&:hover': { boxShadow: '0 4px 14px rgba(15,35,95,0.12)' },
      }}
    >
      <CardActionArea
        component={Link}
        to={`/topics/${topic.id}`}
        sx={{ borderRadius: '10px' }}
        onClick={(e) => { if (confirming || deleting) { e.preventDefault(); e.stopPropagation() } }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 2 }}>
            {/* 左欄：標題 + 次行資訊 */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, m: 0, textDecoration: 'none', color: 'text.primary' }}>
                {topic.name}
              </Typography>
              {topic.description && (
                <Typography variant="body2" color="text.secondary" sx={{ m: 0, mt: 0.5, whiteSpace: 'pre-line' }}>
                  {topic.description}
                </Typography>
              )}
              {showMeta && (
                <Typography component="div" variant="caption" sx={{ color: 'text.secondary', fontSize: 12, mt: 'auto' }}>
                  {topic.mode === 'duel' ? (t('topics.add.modeDuel') || '對立式主題') : (t('topics.add.modeOpen') || '開放式主題')} |
                  {' '}{(typeof topic.count === 'number' ? topic.count : 0)} 個觀點 |
                  {' '}{createdLabel}
                  {' '}|{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.assign(`/topics/edit/${encodeURIComponent(topic.id)}`) }}
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
                      setConfirming(true)
                      const ok = await confirm({ title: '確定刪除？' })
                      setConfirming(false)
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
              )}
              {/* dialog rendered outside CardActionArea to avoid click suppression */}
            </Box>

            {/* 右欄：投票垂直區（阻止冒泡，不導向） */}
            {showVote && (
            <Box
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <IconButton
                size="small"
                aria-label="讚"
                disabled={busy}
                disableRipple
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); vote(1) }}
                sx={{ borderRadius: '10px' }}
              >
                <ThumbsUp size={16} weight="bold" />
              </IconButton>
              <Typography variant="subtitle2" sx={{ minWidth: 16, textAlign: 'center', fontWeight: 800 }}>
                {score}
              </Typography>
              <IconButton
                size="small"
                aria-label="倒讚"
                disabled={busy}
                disableRipple
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); vote(-1) }}
                sx={{ borderRadius: '10px' }}
              >
                <ThumbsDown size={16} weight="bold" />
              </IconButton>
            </Box>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
      {ConfirmDialogEl}
    </Card>
  )
}
