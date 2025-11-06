import Header from '../components/Header'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import { Plus } from 'phosphor-react'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import PageHeader from '../components/PageHeader'

export default function TopicAddPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'open' | 'duel'>('open')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [touched, setTouched] = useState<{ name?: boolean }>({})
  const locked = !!createdId
  return (
    <div className="app">
      <Header />
      <main className="app__inner">
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
              disabled={locked}
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
              disabled={locked}
            />
            <FormControl disabled={locked}>
              <FormLabel sx={{ fontWeight: 700 }}>{t('topics.add.modeLabel') || '主題模式'}</FormLabel>
              <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as 'open' | 'duel')}>
                <FormControlLabel value="open" control={<Radio />} label={t('topics.add.modeOpen') || '開放式主題'} />
                <FormControlLabel value="duel" control={<Radio />} label={t('topics.add.modeDuel') || '對立式主題'} />
              </RadioGroup>
            </FormControl>
            {error && <Alert severity="error" sx={{ mt: 0 }}>{error}</Alert>}
            <Stack spacing={1.5} alignItems="stretch">
              <button
                className="header__cta btn btn-primary btn-md gap-2 w-full justify-center"
                disabled={submitting || !name.trim() || locked}
                aria-busy={submitting}
                onClick={async () => {
                  try {
                    setSubmitting(true)
                    setError(null)
                    const res = await fetch('/api/topics', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, mode }),
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
                    // 顯示下一步提示與按鈕，引導前往新增觀點
                    setCreatedId(body?.data?.id || null)
                    setSuccessOpen(true)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '發布失敗')
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
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
          {createdId && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <p className="text-slate-600" style={{ fontSize: 14, margin: 0 }}>
                {t('topics.add.firstPrompt') || '這個主題空空如也，為主題添加第一個觀點吧！'}
              </p>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                <PrimaryCtaButton to={`/points/add?topic=${createdId}`} size="md" iconLeft={<Plus size={16} weight="bold" />}>
                  新增觀點
                </PrimaryCtaButton>
              </Box>
            </Box>
          )}
        </Box>
      </main>
      <Snackbar
        open={successOpen}
        autoHideDuration={1600}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ width: '100%' }}
      >
        <Box sx={{ width: '100%', maxWidth: 576, px: 2 }}>
          <Alert severity="success" variant="filled" sx={{ borderRadius: '10px', width: '100%' }}>
            {t('topics.add.success') || t('actions.posted')}
          </Alert>
        </Box>
      </Snackbar>
    </div>
  )
}
