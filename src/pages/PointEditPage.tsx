import Header from '../components/Header'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PageHeader from '../components/PageHeader'
import type { Point } from '../data/points'
import type { Topic } from '../data/topics'
import TopicCard from '../components/TopicCard'
import { getJson, type ItemResponse, type ListResponse } from '../api/client'
import DuelTabs, { type DuelValue } from '../components/DuelTabs'

export default function PointEditPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const topicId = params.get('topic') || ''
  // 不需整體狀態，直接落入各欄位
  const [topic, setTopic] = useState<Topic | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [positionSel, setPositionSel] = useState<DuelValue>(null)

  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        const resp = await getJson<ItemResponse<Point>>(`/api/points/${id}`)
        if (aborted) return
        setDescription(resp.data.description || '')
        setPositionSel((resp.data as any).position === 'agree' || (resp.data as any).position === 'others' ? (resp.data as any).position : null)
      } catch (e) {
        if (!aborted) setError('讀取失敗')
      }
    }
    run()
    return () => { aborted = true }
  }, [id])

  // 讀取主題資訊，顯示於表單上方卡片
  useEffect(() => {
    let aborted = false
    async function run() {
      if (!topicId) return
      try {
        let t: Topic | null = null
        try {
          const resp = await getJson<ItemResponse<Topic>>(`/api/topics/id/${topicId}`)
          t = resp.data
        } catch {
          const list = await getJson<ListResponse<Topic>>('/api/topics?page=1&size=1000')
          t = (list.items || []).find((x) => x.id === topicId || (x as any).slug === topicId) || null
        }
        if (!aborted) setTopic(t)
      } catch {}
    }
    run()
    return () => { aborted = true }
  }, [topicId])

  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <Box sx={{ px: 0, py: { xs: 1.5, md: 2 } }}>
          <PageHeader align="center" backButton onBack={() => navigate(topicId ? `/topics/${topicId}` : '/topics')} title={t('points.edit.title') || '編輯觀點'} subtitle={''} />
          <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
            {topic && (
              <div onClick={() => navigate(`/topics/${topic.id}`)}>
                <TopicCard topic={topic} showMeta={false} showVote={false} />
              </div>
            )}
            {topic?.mode === 'duel' && (
              <DuelTabs value={positionSel} onChange={setPositionSel} label={t('points.add.stanceLabel') || '選擇立場'} />
            )}
            <TextField
              label={t('points.add.descLabel') || '你的觀點'}
              fullWidth
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <button
              className="header__cta btn btn-primary btn-md gap-2 w-full justify-center"
              disabled={submitting || !description.trim()}
              aria-busy={submitting}
              onClick={async () => {
                try {
                  setSubmitting(true)
                  setError(null)
                  const res = await fetch(`/api/points/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description: description.trim(), position: topic?.mode === 'duel' ? positionSel || undefined : undefined }),
                  })
                  if (!res.ok) throw new Error('儲存失敗')
                  setSuccessOpen(true)
                  setTimeout(() => navigate(topicId ? `/topics/${topicId}` : '/'), 800)
                } catch (e) {
                  setError(e instanceof Error ? e.message : '儲存失敗')
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {t('actions.save') || '儲存'}
            </button>
          </Stack>
        </Box>
      </main>
      <Snackbar open={successOpen} autoHideDuration={1000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ width: '100%' }}>
        <Box sx={{ width: '100%', maxWidth: 576, px: 2 }}>
          <Alert severity="success" variant="filled" sx={{ borderRadius: '10px', width: '100%' }}>
            {t('actions.save') || '儲存'} OK
          </Alert>
        </Box>
      </Snackbar>
    </div>
  )
}
