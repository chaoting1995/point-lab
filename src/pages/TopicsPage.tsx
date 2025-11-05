import Header from '../components/Header'
import useLanguage from '../i18n/useLanguage'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { Topic } from '../data/topics'
import { getJson, type ListResponse } from '../api/client'
import { useEffect, useRef, useState } from 'react'
import { Plus } from 'phosphor-react'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import TopicCard from '../components/TopicCard'
import SortTabs from '../components/SortTabs'
import type { SortKey } from '../hooks/useSortTabs'
import { usePagedList } from '../hooks/usePagedList'
import PageHeader from '../components/PageHeader'

export default function TopicsPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [sort, setSort] = useState<SortKey>('new')
  const [items, setItems] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  async function fetchFirstPage(currentSort: SortKey) {
    setLoading(true)
    setError(null)
    try {
      const resp = await getJson<ListResponse<Topic>>(`/api/topics?page=1&size=30&sort=${currentSort}`)
      setItems(resp.items || [])
      setTotal((resp as any).total)
      setHasMore(((resp.items || []).length || 0) === 30)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  // simple first-page fetch to ensure visible content
  useEffect(() => {
    let aborted = false
    ;(async () => {
      if (aborted) return
      await fetchFirstPage(sort)
    })()
    return () => { aborted = true }
  }, [sort])

  const handleSortChange = (v: SortKey) => {
    setSort(v)
  }

  // 保持簡潔：改用純 CSS sticky，避免 JS 介入造成抖動

  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <div className="p-4 md:p-5">
          <PageHeader
            title={t('topics.list.title')}
            subtitle={
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('topics.list.subtitleA') || '探索你感興趣的主題'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <span
                    onClick={() => navigate('/topics/add')}
                    role="link"
                    style={{ color: 'var(--mui-palette-primary-main, #4f46e5)', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {t('topics.list.ctaHighlight')}
                  </span>
                  {t('topics.list.ctaTail')}
                </Typography>
              </Box>
            }
            align="center"
          />
          <SortTabs value={sort} onChange={handleSortChange} />
          {loading && <p className="text-slate-500">{t('common.loading')}</p>}
          {error && <p className="text-rose-500">{error}</p>}
          {!error && (
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map((t) => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  onDeleted={async () => { await fetchFirstPage(sort) }}
                />
              ))}
              {hasMore && <div ref={sentinelRef} />}
              {loading && <p className="text-center text-slate-500">{t('common.loading')}</p>}
              {!hasMore && !loading && items.length > 0 && (
                <>
                  <p className="text-center text-slate-400" style={{ fontSize: 12 }}>{t('common.allLoaded')}</p>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                    <PrimaryCtaButton to="/topics/add" size="md" iconLeft={<Plus size={16} weight="bold" />}>
                      {t('topics.list.add')}
                    </PrimaryCtaButton>
                  </Box>
                </>
              )}
              {!loading && items.length === 0 && (total === 0 || total === undefined) && (
                <>
                  <p className="text-center text-slate-400" style={{ fontSize: 14 }}>{t('topics.list.empty')}</p>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                    <PrimaryCtaButton to="/topics/add" size="md" iconLeft={<Plus size={16} weight="bold" />}>
                      {t('topics.list.add')}
                    </PrimaryCtaButton>
                  </Box>
                </>
              )}
            </Box>
          )}
        </div>
      </main>
    </div>
  )
}
