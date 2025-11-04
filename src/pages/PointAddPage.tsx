import Header from '../components/Header'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PageHeader from '../components/PageHeader'
import type { Topic } from '../data/topics'
import { getJson, type ItemResponse, type ListResponse } from '../api/client'
import useAuth from '../auth/AuthContext'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import ButtonGroup from '@mui/material/ButtonGroup'
import Button from '@mui/material/Button'

export default function PointAddPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [params] = useSearchParams()
  const topicId = params.get('topic') || ''
  const [topic, setTopic] = useState<Topic | null>(null)
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [touched, setTouched] = useState<{ desc?: boolean; name?: boolean }>({})
  const { user } = useAuth()
  const [useGuest, setUseGuest] = useState(false)
  // 對立模式下的立場選擇；null 代表未選擇
  const [positionSel, setPositionSel] = useState<null | 'agree' | 'others'>(null)

  useEffect(() => {
    let aborted = false
    async function run() {
      if (!topicId) return
      try {
        // 優先以 id 取資料，失敗時回退到列表搜尋（支援舊 slug）
        let t: Topic | null = null
        try {
          const resp = await getJson<ItemResponse<Topic>>(`/api/topics/id/${topicId}`)
          t = resp.data
        } catch {
          const list = await getJson<ListResponse<Topic>>('/api/topics')
          t = (list.items || []).find((x) => x.id === topicId || x.slug === topicId) || null
        }
        if (!aborted) setTopic(t)
      } catch {
        if (!aborted) setTopic(null)
      }
    }
    run()
    return () => { aborted = true }
  }, [topicId])

  // 初始化訪客名稱（未登入時，若 localStorage 有則使用並隱藏輸入框）
  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem('pl:guestName')
        // 只有打開頁面時若 localStorage 已有名稱，才預填並隱藏欄位
        if (stored && !authorName) setAuthorName(stored)
      } catch {}
    }
    // 僅在首次 render（無 user 改變）時檢查；不要依賴 authorName，以免輸入中被覆蓋
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
          <PageHeader
            align="center"
            backButton
            onBack={() => navigate(-1)}
            title={topic?.name || (t('points.add.title') || '新增觀點')}
            subtitle={topic?.description || (t('points.add.subtitle') || '')}
          />

          <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
            {/* 對立模式：立場選擇（Button Group） */}
            {topic?.mode === 'duel' && (
              <FormControl sx={{ display: 'flex', alignItems: 'stretch' }}>
                <FormLabel sx={{ mb: 1, textAlign: 'left', fontWeight: 700 }}>{t('points.add.stanceLabel') || '選擇立場'}</FormLabel>
                <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                  <Button
                    fullWidth
                    variant={positionSel === 'agree' ? 'contained' : 'outlined'}
                    onClick={() => setPositionSel('agree')}
                    sx={{
                      flex: 1,
                      borderRadius: '10px',
                      bgcolor: positionSel === 'agree' ? 'rgba(16,185,129,1)' : 'transparent',
                      color: positionSel === 'agree' ? '#fff' : 'rgba(16,185,129,1)',
                      borderColor: 'rgba(16,185,129,1)',
                      '&:hover': {
                        bgcolor: positionSel === 'agree' ? 'rgba(5,150,105,1)' : 'rgba(16,185,129,0.08)',
                        borderColor: 'rgba(16,185,129,1)',
                      },
                    }}
                  >
                    {t('points.add.stanceAgree') || '讚同'}
                  </Button>
                  <Button
                    fullWidth
                    variant={positionSel === 'others' ? 'contained' : 'outlined'}
                    onClick={() => setPositionSel('others')}
                    sx={{
                      flex: 1,
                      borderRadius: '10px',
                      bgcolor: positionSel === 'others' ? 'rgba(239,68,68,1)' : 'transparent',
                      color: positionSel === 'others' ? '#fff' : 'rgba(239,68,68,1)',
                      borderColor: 'rgba(239,68,68,1)',
                      '&:hover': {
                        bgcolor: positionSel === 'others' ? 'rgba(220,38,38,1)' : 'rgba(239,68,68,0.08)',
                        borderColor: 'rgba(239,68,68,1)',
                      },
                    }}
                  >
                    {t('points.add.stanceOther') || '其他'}
                  </Button>
                </Box>
              </FormControl>
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
            />
            {/* 登入狀態：可切換是否使用訪客身份 */}
            {user ? (
              <>
                <FormControlLabel
                  control={<Switch checked={useGuest} onChange={(e) => setUseGuest(e.target.checked)} />}
                  label={t('points.add.useGuest') || '使用訪客身份'}
                />
                {useGuest && (
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
                  />
                )}
              </>
            ) : (
              // 未登入：只有當頁面初始時已存在 guestName 才自動隱藏輸入；否則顯示輸入框直到發布成功後才保存
              !localStorage.getItem('pl:guestName') ? (
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
                />
              ) : null
            )}
            {error && <Alert severity="error" sx={{ mt: 0 }}>{error}</Alert>}
            <Stack spacing={1.5} alignItems="stretch">
              <button
                className="header__cta btn btn-primary btn-md gap-2 w-full justify-center"
                disabled={
                  submitting ||
                  !description.trim() ||
                  // 登入且未使用訪客身份：不需填作者名
                  (!!user && !useGuest ? false : !authorName.trim()) ||
                  // 對立模式需選擇立場
                  (topic?.mode === 'duel' && !positionSel)
                }
                aria-busy={submitting}
                onClick={async () => {
                  try {
                    setSubmitting(true)
                    setError(null)
                  const res = await fetch('/api/points', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      description: description.trim(),
                      topicId: topicId || undefined,
                      authorName: (!!user && !useGuest) ? undefined : authorName.trim(),
                      authorType: (!!user && !useGuest) ? 'user' : 'guest',
                      position: topic?.mode === 'duel' ? positionSel || undefined : undefined,
                    }),
                  })
                    if (!res.ok) throw new Error('發布失敗，請稍後再試')
                    await res.json()
                    try {
                      if (!user) {
                        const nameToSave = authorName.trim()
                        if (nameToSave) localStorage.setItem('pl:guestName', nameToSave)
                      }
                    } catch {}
                    setSuccessOpen(true)
                    setTimeout(() => navigate(topicId ? `/topics/${topicId}` : '/'), 1200)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '發布失敗')
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    {t('actions.publish')}
                  </>
                ) : (
                  t('actions.publish')
                )}
              </button>
            </Stack>
          </Stack>
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
