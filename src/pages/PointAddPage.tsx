import Header from '../components/Header'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PageHeader from '../components/PageHeader'
import TopicCard from '../components/TopicCard'
import type { Topic } from '../data/topics'
import { getJson, type ItemResponse, type ListResponse, withBase } from '../api/client'
import useAuth from '../auth/AuthContext'
import DuelTabs, { type DuelValue } from '../components/DuelTabs'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import { addGuestItem } from '../utils/guestActivity'
import { getOrCreateGuestId, saveGuestName } from '../utils/guest'
import ClipLoader from 'react-spinners/ClipLoader'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'

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
  const [params, setSearchParams] = useSearchParams()
  const initialTopicId = params.get('topic') || ''
  const [topicId, setTopicId] = useState(initialTopicId)
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
  const [topicSelectorOpen, setTopicSelectorOpen] = useState(false)
  const [topicOptions, setTopicOptions] = useState<Topic[]>([])
  const [topicOptionsLoading, setTopicOptionsLoading] = useState(false)
  const [topicSearch, setTopicSearch] = useState('')
  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return topicOptions
    const kw = topicSearch.trim().toLowerCase()
    return topicOptions.filter((t) => t.name.toLowerCase().includes(kw) || (t.description || '').toLowerCase().includes(kw))
  }, [topicOptions, topicSearch])
  const loadTopicOptions = useCallback(async () => {
    if (topicOptionsLoading) return
    setTopicOptionsLoading(true)
    try {
      const resp = await getJson<ListResponse<Topic>>('/api/topics?page=1&size=500&sort=new')
      setTopicOptions(resp.items || [])
    } catch {
      setTopicOptions([])
    } finally {
      setTopicOptionsLoading(false)
    }
  }, [topicOptionsLoading])

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
    if (topicSelectorOpen && topicOptions.length === 0 && !topicOptionsLoading) {
      loadTopicOptions()
    }
  }, [topicSelectorOpen, topicOptions.length, topicOptionsLoading, loadTopicOptions])

  const applySearchParam = useCallback((value: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set('topic', value)
    else next.delete('topic')
    setSearchParams(next, { replace: true })
  }, [params, setSearchParams])

  const handleTopicSelect = (item: Topic) => {
    setTopic(item)
    setTopicId(item.id)
    setLoadingTopic(false)
    applySearchParam(item.id)
    setTopicSelectorOpen(false)
  }

  const handleTopicClear = () => {
    setTopic(null)
    setTopicId('')
    setPositionSel(null)
    setLoadingTopic(false)
    applySearchParam(null)
    setTopicSelectorOpen(false)
  }

  useEffect(() => {
    let aborted = false
    async function run() {
      if (!topicId) {
        setTopic(null)
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
            title={t('points.add.title')}
            subtitle={''}
          />

          <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', opacity: submitting ? 0.6 : 1 }}>
            <Box
              onClick={() => setTopicSelectorOpen(true)}
              className="layout-card"
              sx={{
                border: topic ? '1px solid transparent' : '1px dashed rgba(79,70,229,0.4)',
                boxShadow: topic ? undefined : '0 0 0 1px rgba(79,70,229,0.15)',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                cursor: 'pointer',
                p: 0,
              }}
            >
              {loadingTopic ? (
                <Box sx={{ p: 2 }}>
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" width="50%" height={18} />
                </Box>
              ) : topic ? (
                <Box sx={{ pointerEvents: 'none' }}>
                  <TopicCard topic={topic} showMeta={false} showVote={false} />
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{t('points.add.selectTopic')}</Typography>
                  <Typography variant="body2" color="text.secondary">點擊挑選一個主題後才能發布觀點</Typography>
                </Box>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {topic ? '點擊更換主題' : '請先選擇主題'}
            </Typography>
            {topic && (topic.count ?? 0) === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontSize: 14, mt: -0.5 }}>
                {t('topics.add.firstPrompt')}
              </Typography>
            )}
            {/* 對立模式：立場選擇（Button Group） */}
            {topic?.mode === 'duel' && (
              <DuelTabs
                value={positionSel}
                onChange={setPositionSel}
                label={t('points.add.stanceLabel')}
                disabled={submitting}
              />
            )}
            <TextField
              label={t('points.add.descLabel')}
              placeholder={t('points.add.descPlaceholder')}
              fullWidth
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, desc: true }))}
              required
              error={touched.desc && !description.trim()}
              helperText={touched.desc && !description.trim() ? ((t('points.add.descLabel')) + ' 為必填') : ' '}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
              disabled={submitting}
            />
            {!user && (
              <TextField
                label={t('points.add.nameLabel')}
                placeholder={t('points.add.namePlaceholder')}
                fullWidth
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, name: true }))}
                required
                error={touched.name && !authorName.trim()}
                helperText={touched.name && !authorName.trim() ? ((t('points.add.nameLabel')) + ' 為必填') : ' '}
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
              !topicId ||
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
      <Dialog
        open={topicSelectorOpen}
        onClose={() => setTopicSelectorOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle>選擇主題</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            value={topicSearch}
            onChange={(e) => setTopicSearch(e.target.value)}
            placeholder="搜尋主題名稱或描述"
          />
          {topicOptionsLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <Box key={`topic-opt-skel-${idx}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" width="60%" height={16} />
                </Box>
              ))}
            </Box>
          ) : (
            <List sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {filteredTopics.map((opt) => (
                <ListItemButton
                  key={opt.id}
                  onClick={() => handleTopicSelect(opt)}
                  selected={opt.id === topicId}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-of-type': { borderBottom: 'none' },
                    borderRadius: 0,
                  }}
                >
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>{opt.name}</Typography>}
                    secondary={opt.description || ''}
                  />
                </ListItemButton>
              ))}
              {!topicOptionsLoading && filteredTopics.length === 0 && (
                <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }}>找不到符合的主題</Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, gap: 1, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => setTopicSelectorOpen(false)}
            sx={(t) => ({
              color: t.palette.text.secondary,
              borderColor: t.palette.divider,
              '&:hover': { borderColor: t.palette.text.disabled, bgcolor: t.palette.action.hover },
              borderRadius: '10px',
              minWidth: 120,
            })}
          >
            取消
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!topicId}
            onClick={handleTopicClear}
            sx={(t) => ({
              borderRadius: '10px',
              minWidth: 120,
              bgcolor: topicId ? t.palette.primary.main : t.palette.action.disabled,
              '&:hover': topicId ? { bgcolor: t.palette.primary.dark } : {},
            })}
          >
            清除選擇
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
