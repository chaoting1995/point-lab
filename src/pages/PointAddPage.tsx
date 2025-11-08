import Header from '../components/Header'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PageHeader from '../components/PageHeader'
import TopicCard from '../components/TopicCard'
import type { Topic } from '../data/topics'
import { getJson, type ItemResponse, withBase } from '../api/client'
import useAuth from '../auth/AuthContext'
import DuelTabs, { type DuelValue } from '../components/DuelTabs'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import { addGuestItem } from '../utils/guestActivity'
import { getOrCreateGuestId, saveGuestName } from '../utils/guest'
import ClipLoader from 'react-spinners/ClipLoader'

function SubmittingOverlay({ open }: { open: boolean }) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <>
      <LinearProgress
        color="primary"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 3000,
          height: 4,
        }}
      />
    </>,
    document.body,
  )
}

export default function PointAddPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [params] = useSearchParams()
  const topicId = params.get('topic') || ''
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loadingTopic, setLoadingTopic] = useState(!!topicId)
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [touched, setTouched] = useState<{ desc?: boolean; name?: boolean }>({})
  const { user } = useAuth()
  // 對立模式下的立場選擇；null 代表未選擇
  const [positionSel, setPositionSel] = useState<DuelValue>(null)

  const handleTopicCardClick = useCallback(() => {
    if (submitting || !topic) return
    navigate(`/topics/${topic.id}`)
  }, [submitting, topic, navigate])

  const handleSubmit = useCallback(async () => {
    setTouched({ desc: true, name: true })
    if (!description.trim()) return
    if (!user && !authorName.trim()) return
    if (topic?.mode === 'duel' && !positionSel) return
    try {
      setSubmitting(true)
      setError(null)
      const res = await fetch(withBase('/api/points'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          topicId: topicId || undefined,
          authorName: user ? undefined : authorName.trim(),
          authorType: user ? 'user' : 'guest',
          position: topic?.mode === 'duel' ? positionSel || undefined : undefined,
          ...(user ? {} : { guestId: getOrCreateGuestId() }),
        }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('發布失敗，請稍後再試')
      const body = await res.json().catch(() => null)
      try {
        if (!user) {
          const nameToSave = authorName.trim()
          if (nameToSave) saveGuestName(nameToSave)
        }
      } catch {}
      try {
        if (!user) {
          const pid = body?.data?.id
          if (pid) addGuestItem('point', pid)
        }
      } catch {}
      setSuccessOpen(true)
      navigate(topicId ? `/topics/${topicId}` : '/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '發布失敗')
    } finally {
      setSubmitting(false)
    }
  }, [description, user, authorName, topic, positionSel, topicId, navigate])

  useEffect(() => {
    let aborted = false
    async function run() {
      if (!topicId) {
        setLoadingTopic(false)
        return
      }
      try {
        let t: Topic | null = null
        const resp = await getJson<ItemResponse<Topic>>(`/api/topics/id/${topicId}`)
        t = resp.data
        if (!aborted) setTopic(t)
      } catch {
        if (!aborted) setTopic(null)
      } finally {
        if (!aborted) setLoadingTopic(false)
      }
    }
    run()
    return () => { aborted = true }
  }, [topicId])

  // 初始化訪客名稱（未登入時，若 localStorage 有則使用並隱藏輸入框）
  useEffect(() => {
    if (!user) {
      try {
        const storedObj = localStorage.getItem('pl:guest')
        const name = storedObj ? (JSON.parse(storedObj).name as string | undefined) : undefined
        if (name && !authorName) setAuthorName(name)
      } catch {}
    }
    // 僅在首次 render（無 user 改變）時檢查；不要依賴 authorName，以免輸入中被覆蓋
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app">
      <Header />
      <SubmittingOverlay open={submitting} />
      <main className="app__inner" aria-busy={submitting} aria-live="polite">
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
          <PageHeader
            align="center"
            backButton
            onBack={() => navigate(topicId ? `/topics/${topicId}` : '/topics')}
            title={t('points.add.title') || '新增觀點'}
            subtitle={''}
          />

          <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', opacity: submitting ? 0.6 : 1 }}>
            {/* 顯示主題卡片（隱藏投票與附加資訊），點擊返回主題詳頁 */}
            {loadingTopic ? (
              <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 2 }}>
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={18} />
              </Box>
            ) : (
              topic && (
                <div onClick={handleTopicCardClick} style={{ cursor: submitting ? 'default' : 'pointer', pointerEvents: submitting ? 'none' : 'auto' }}>
                  <TopicCard topic={topic} showMeta={false} showVote={false} />
                  {(topic.count ?? 0) === 0 && (
                    <Box sx={{ mt: 1.5, px: 1 }}>
                      <p className="text-slate-600" style={{ fontSize: 14, margin: 0, textAlign: 'center' }}>
                        {t('topics.add.firstPrompt') || '這個主題空空如也，為主題添加第一個觀點吧！'}
                      </p>
                    </Box>
                  )}
                </div>
              )
            )}
            {/* 對立模式：立場選擇（Button Group） */}
            {topic?.mode === 'duel' && (
              <DuelTabs
                value={positionSel}
                onChange={setPositionSel}
                label={t('points.add.stanceLabel') || '選擇立場'}
                disabled={submitting}
              />
            )}
            <TextField
              label={t('points.add.descLabel') || '觀點內容'}
              placeholder={t('points.add.descPlaceholder') || '寫下你的觀點…'}
              fullWidth
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, desc: true }))}
              required
              error={touched.desc && !description.trim()}
              helperText={touched.desc && !description.trim() ? ((t('points.add.descLabel') || '你的觀點') + ' 為必填') : ' '}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
              disabled={submitting}
            />
            {!user && (
              <TextField
                label={t('points.add.nameLabel') || '你的名稱（無需註冊）'}
                placeholder={t('points.add.namePlaceholder') || '例如：小明'}
                fullWidth
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, name: true }))}
                required
                error={touched.name && !authorName.trim()}
                helperText={touched.name && !authorName.trim() ? ((t('points.add.nameLabel') || '你的名稱') + ' 為必填') : ' '}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
                disabled={submitting}
              />
            )}
            {error && <Alert severity="error" sx={{ mt: 0 }}>{error}</Alert>}
          </Stack>
          <PrimaryCtaButton
            size="md"
            fullWidth
            className="gap-2 justify-center"
            disabled={
              loadingTopic ||
              submitting ||
              !description.trim() ||
              (!user && !authorName.trim()) ||
              (topic?.mode === 'duel' && !positionSel)
            }
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <ClipLoader size={16} color="currentColor" speedMultiplier={0.9} />
                {t('actions.publish')}
              </>
            ) : (
              t('actions.publish')
            )}
          </PrimaryCtaButton>
        </Box>
      </main>
      <Snackbar
        open={successOpen}
        autoHideDuration={1200}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ width: '100%' }}
      >
        <Box sx={{ width: '100%', maxWidth: 576, px: 2 }}>
          <Alert severity="success" variant="filled" sx={{ borderRadius: '10px', width: '100%' }}>
            {t('actions.posted')}
          </Alert>
        </Box>
      </Snackbar>
    </div>
  )
}
