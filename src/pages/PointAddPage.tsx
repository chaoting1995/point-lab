import Header from '../components/Header'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PageHeader from '../components/PageHeader'
import TopicCard from '../components/TopicCard'
import type { Topic } from '../data/topics'
import { getJson, type ItemResponse, type ListResponse, withAuthHeaders, withBase } from '../api/client'
import useAuth from '../auth/AuthContext'
import DuelTabs, { type DuelValue } from '../components/DuelTabs'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import { addGuestItem } from '../utils/guestActivity'
import { getOrCreateGuestId, saveGuestName } from '../utils/guest'
import ClipLoader from 'react-spinners/ClipLoader'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { X } from 'phosphor-react'

const MAX_INPUTS = 50
let descInputSeed = 0
type DescriptionInput = { id: string; value: string }
const createDescInput = (): DescriptionInput => ({
  id: `desc-${Date.now().toString(36)}-${descInputSeed++}`,
  value: '',
})

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
  const [descriptionInputs, setDescriptionInputs] = useState<DescriptionInput[]>(() => [createDescInput()])
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [descError, setDescError] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const { user } = useAuth()
  // 對立模式下的立場選擇；null 代表未選擇
  const [positionSel, setPositionSel] = useState<DuelValue>(null)
  const [topicSelectorOpen, setTopicSelectorOpen] = useState(false)
  const [topicOptions, setTopicOptions] = useState<Topic[]>([])
  const [topicOptionsLoading, setTopicOptionsLoading] = useState(false)
  const [topicSearch, setTopicSearch] = useState('')
  const hasValidDescription = useMemo(
    () => descriptionInputs.some((item) => item.value.trim()),
    [descriptionInputs],
  )
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
    const trimmedDescriptions = descriptionInputs.map((item) => item.value.trim()).filter(Boolean)
    const hasDescription = trimmedDescriptions.length > 0
    setDescError(!hasDescription)
    if (!hasDescription) return
    if (!user && !authorName.trim()) {
      setNameTouched(true)
      return
    }
    if (topic?.mode === 'duel' && !positionSel) return
    try {
      setSubmitting(true)
      setError(null)
      const guestId = user ? undefined : getOrCreateGuestId()
      const res = await fetch(withBase('/api/points'), {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          descriptions: trimmedDescriptions,
          topicId: topicId || undefined,
          authorName: user ? undefined : authorName.trim(),
          authorType: user ? 'user' : 'guest',
          position: topic?.mode === 'duel' ? positionSel || undefined : undefined,
          ...(guestId ? { guestId } : {}),
        }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('發布失敗，請稍後再試')
      const body = await res.json().catch(() => null)
      try {
        if (!user) {
          const createdList = Array.isArray(body?.data) ? body?.data : body?.data ? [body.data] : []
          for (const item of createdList) {
            const pid = item?.id
            if (pid) addGuestItem('point', pid)
          }
        }
      } catch {}
      try {
        if (!user) {
          const nameToSave = authorName.trim()
          if (nameToSave) saveGuestName(nameToSave)
        }
      } catch {}
      setSuccessOpen(true)
      navigate(topicId ? `/topics/${topicId}` : '/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '發布失敗')
    } finally {
      setSubmitting(false)
    }
  }, [descriptionInputs, user, authorName, topic, positionSel, topicId, navigate])

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

  const handleDescriptionChange = useCallback(
    (id: string, value: string) => {
      setDescriptionInputs((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, value } : item))
        if (descError && next.some((item) => item.value.trim())) setDescError(false)
        return next
      })
    },
    [descError],
  )

  const handleRemoveInput = useCallback((id: string) => {
    setDescriptionInputs((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0) return [createDescInput()]
      if (descError && next.some((item) => item.value.trim())) setDescError(false)
      return next
    })
  }, [descError])

  const handleAddInput = useCallback(() => {
    if (!user) return
    setDescriptionInputs((prev) => {
      if (prev.length >= MAX_INPUTS) return prev
      return [...prev, createDescInput()]
    })
  }, [user])

  const reachedMaxInputs = descriptionInputs.length >= MAX_INPUTS
  const addInputDisabled = !user || reachedMaxInputs || submitting

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
                  disabled={submitting || !topicId}
              />
            )}
            <Stack spacing={1}>
              {descriptionInputs.map((input, idx) => (
                <Box key={input.id} sx={{ position: 'relative' }}>
                  <TextField
                    label={
                      descriptionInputs.length > 1 ? `${t('points.add.descLabel')} #${idx + 1}` : t('points.add.descLabel')
                    }
                    placeholder={t('points.add.descPlaceholder')}
                    fullWidth
                    multiline
                    minRows={4}
                    value={input.value}
                    onChange={(e) => handleDescriptionChange(input.id, e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
                    disabled={submitting || !topicId}
                    error={idx === 0 && descError && !hasValidDescription}
                    helperText={idx === 0 && descError && !hasValidDescription ? t('points.add.descRequired') : ' '}
                  />
                  {descriptionInputs.length > 1 && (
                    <IconButton
                      aria-label={t('points.add.removeInput')}
                      onClick={() => handleRemoveInput(input.id)}
                      disabled={submitting || !topicId}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        right: -12,
                        backgroundColor: '#f87171',
                        color: 'common.white',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                        '&:hover': { backgroundColor: '#ef4444' },
                        '&:disabled': { opacity: 0.45, backgroundColor: '#fca5a5' },
                      }}
                    >
                      <X size={16} weight="bold" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
            <Stack spacing={0.5} sx={{ textAlign: 'center', mt: 1, mb: 3 }}>
              <Button
                variant="outlined"
                onClick={handleAddInput}
                disabled={addInputDisabled}
                sx={{ fontWeight: 600 }}
              >
                {t('points.add.addInput')}
              </Button>
              {!user && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  {t('points.add.bulkHint')}
                </Typography>
              )}
              {reachedMaxInputs && (
                <Typography variant="body2" color="error">
                  {t('points.add.maxInputs')}
                </Typography>
              )}
            </Stack>
            {!user && (
              <TextField
                label={t('points.add.nameLabel')}
                placeholder={t('points.add.namePlaceholder')}
                fullWidth
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                required
                error={nameTouched && !authorName.trim()}
                helperText={nameTouched && !authorName.trim() ? `${t('points.add.nameLabel')} 為必填` : ' '}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
                disabled={submitting}
              />
            )}
            {error && <Alert severity="error" sx={{ mt: 0 }}>{error}</Alert>}
          </Stack>
          <Box sx={{ mt: 3 }}>
            <PrimaryCtaButton
              size="md"
              fullWidth
              className="gap-2 justify-center"
              disabled={
                loadingTopic ||
                submitting ||
                !topicId ||
                !hasValidDescription ||
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
      </Dialog>
    </div>
  )
}
