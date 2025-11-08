import Header from '../components/Header'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useLanguage from '../i18n/useLanguage'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PageHeader from '../components/PageHeader'
import type { Topic } from '../data/topics'
import { getJson, type ItemResponse, withBase } from '../api/client'

export default function TopicEditPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { id = '' } = useParams()
  // 僅用於初始化表單，無需保存整個 topic 狀態
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [touched, setTouched] = useState<{ name?: boolean }>({})

  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        const resp = await getJson<ItemResponse<Topic>>(`/api/topics/id/${id}`)
        if (aborted) return
        setName(resp.data.name || '')
        setDescription(resp.data.description || '')
      } catch (e) {
        if (!aborted) setError('讀取失敗')
      }
    }
    run()
    return () => { aborted = true }
  }, [id])

  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <Box sx={{ px: 0, py: { xs: 1.5, md: 2 } }}>
          <PageHeader align="center" backButton onBack={() => navigate(-1)} title={t('topics.edit.title')} subtitle={t('topics.add.subtitle')} />
          <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
            <TextField
              label={t('topics.add.nameLabel')}
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, name: true }))}
              required
              error={touched.name && !name.trim()}
              helperText={touched.name && !name.trim() ? (t('topics.add.nameLabel') + ' 為必填') : ' '}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
            />
            <TextField
              label={t('topics.add.descLabel')}
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'common.white' } }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <button
              className="header__cta btn btn-primary btn-md gap-2 w-full justify-center"
              disabled={submitting || !name.trim()}
              aria-busy={submitting}
              onClick={async () => {
                try {
                  setSubmitting(true)
                  setError(null)
                  const res = await fetch(withBase(`/api/topics/${id}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
                  })
                  if (!res.ok) throw new Error('儲存失敗')
                  setSuccessOpen(true)
                  setTimeout(() => navigate('/topics'), 800)
                } catch (e) {
                  setError(e instanceof Error ? e.message : '儲存失敗')
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {t('actions.save')}
            </button>
          </Stack>
        </Box>
      </main>
      <Snackbar open={successOpen} autoHideDuration={1000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ width: '100%' }}>
        <Box sx={{ width: '100%', maxWidth: 576, px: 2 }}>
          <Alert severity="success" variant="filled" sx={{ borderRadius: '10px', width: '100%' }}>
            {t('actions.save')} OK
          </Alert>
        </Box>
      </Snackbar>
    </div>
  )
}
