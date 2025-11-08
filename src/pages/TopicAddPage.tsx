import Header from '../components/Header'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import PageHeader from '../components/PageHeader'
import { withAuthHeaders, withBase } from '../api/client'
import { getOrCreateGuestId, getGuestName } from '../utils/guest'
import useAuth from '../auth/AuthContext'
import { addGuestItem } from '../utils/guestActivity'
import LinearProgress from '@mui/material/LinearProgress'
import ClipLoader from 'react-spinners/ClipLoader'

function SubmittingOverlay({ open }: { open: boolean }) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(
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
    />,
    document.body,
  )
}

export default function TopicAddPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'open' | 'duel'>('open')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState<{ name?: boolean }>({})
  const isDisabled = submitting
  return (
    <div className="app">
      <Header />
      <SubmittingOverlay open={submitting} />
      <main className="app__inner" aria-busy={submitting}>
        {/* 去除雙層 padding，遵循 8px 側邊間距（由 .app__inner 控制） */}
        <Box sx={{ px: 0 }}>
          <PageHeader
            align="center"
            backButton
            onBack={() => navigate('/topics')}
            title={t('topics.add.title')}
            subtitle={t('topics.add.subtitle')}
          />

          <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
            <TextField
              label={t('topics.add.nameLabel')}
              placeholder={t('topics.add.namePlaceholder')}
              fullWidth
              size="medium"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, name: true }))}
              required
              error={touched.name && !name.trim()}
              helperText={touched.name && !name.trim() ? (t('topics.add.nameLabel') + ' 為必填') : ' '}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
              disabled={isDisabled}
            />
            <TextField
              label={t('topics.add.descLabel')}
              placeholder={t('topics.add.descPlaceholder')}
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
              disabled={isDisabled}
            />
            <FormControl disabled={isDisabled}>
              <FormLabel sx={{ fontWeight: 700 }}>{t('topics.add.modeLabel')}</FormLabel>
              <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as 'open' | 'duel')}>
                <FormControlLabel value="open" control={<Radio />} label={t('topics.add.modeOpen')} />
                <FormControlLabel value="duel" control={<Radio />} label={t('topics.add.modeDuel')} />
              </RadioGroup>
            </FormControl>
            {error && <Alert severity="error" sx={{ mt: 0 }}>{error}</Alert>}
            <Stack spacing={1.5} alignItems="stretch">
              <button
                className="header__cta btn btn-primary btn-md gap-2 w-full justify-center"
                disabled={isDisabled || !name.trim()}
                aria-busy={submitting}
                onClick={async () => {
                  try {
                    setSubmitting(true)
                    setError(null)
                    const res = await fetch(withBase('/api/topics'), {
                      method: 'POST',
                      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
                      credentials: 'include',
                      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, mode, ...(user?{}:{ guestId: getOrCreateGuestId(), authorName: getGuestName() || undefined }) }),
                    })
                    if (!res.ok) {
                      // 盡量解析 JSON 錯誤碼，否則顯示友善訊息
                      let message = '發布失敗，請稍後再試'
                      try {
                        const ct = res.headers.get('content-type') || ''
                        if (ct.includes('application/json')) {
                          const data = await res.json()
                          if (data?.error === 'NAME_REQUIRED') message = '請先輸入主題名稱'
                          else if (data?.error) message = data.error
                        } else {
                          // 常見狀況：後端未啟動或代理失效，返回 HTML 'Cannot POST /api/topics'
                          if (res.status === 404 || res.status === 405) {
                            message = '無法連線 API：請啟動後端（npm run server 或 npm run dev:all）'
                          }
                        }
                      } catch {
                        // ignore parse error and use default friendly message
                      }
                      throw new Error(message)
                    }
                    const body = await res.json()
                    const topicId = body?.data?.id
                    try {
                      if (topicId && !body?.data?.createdBy) addGuestItem('topic', topicId)
                    } catch {}
                    if (topicId) {
                      navigate(`/points/add?topic=${encodeURIComponent(topicId)}`)
                    } else {
                      navigate('/topics')
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '發布失敗')
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                {submitting ? (
                  <>
                    <ClipLoader size={16} color="currentColor" speedMultiplier={0.9} />
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
    </div>
  )
}
