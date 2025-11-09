import Header from '../components/Header'
import Footer from '../components/Footer'
import useLanguage from '../i18n/useLanguage'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { Topic } from '../data/topics'
import { getJson, type ListResponse } from '../api/client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus } from 'phosphor-react'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import TopicCard from '../components/TopicCard'
import { TopicCardSkeleton } from '../components/Skeletons'
import SortTabs from '../components/SortTabs'
import type { SortKey } from '../hooks/useSortTabs'
import PageHeader from '../components/PageHeader'

export default function TopicsPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [sort, setSort] = useState<SortKey>('new')
  const [items, setItems] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const PAGE_SIZE = 20

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [])

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const resp = await getJson<ListResponse<Topic>>(`/api/topics?page=${nextPage}&size=${PAGE_SIZE}&sort=${sort}`)
        const list = resp.items || []
        setItems((prev) => (append ? [...prev, ...list] : list))
        setPage(nextPage)
        setTotal(resp.total)
        if (typeof resp.total === 'number') {
          setHasMore(nextPage * PAGE_SIZE < resp.total)
        } else {
          setHasMore(list.length === PAGE_SIZE)
        }
        setInitialLoaded(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed')
      } finally {
        setLoading(false)
      }
    },
    [sort],
  )

  useEffect(() => {
    setItems([])
    setInitialLoaded(false)
    setHasMore(true)
    setPage(1)
    loadPage(1, false)
  }, [sort, loadPage])

  const handleSortChange = (v: SortKey) => {
    setSort(v)
  }

  useEffect(() => {
    if (!initialLoaded || !hasMore || loading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        observerRef.current?.disconnect()
        loadPage(page + 1, true)
      }
    })
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [initialLoaded, hasMore, loading, loadPage, page])

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
                  {t('topics.list.subtitleA')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <Box
                    component="span"
                    role="link"
                    onClick={() => navigate('/topics/add')}
                    sx={(theme)=>({ color: theme.palette.primary.main, fontWeight: 800, cursor: 'pointer' })}
                  >
                    {t('topics.list.ctaHighlight')}
                  </Box>
                  {t('topics.list.ctaTail')}
                </Typography>
              </Box>
            }
            align="center"
          />
          <SortTabs value={sort} onChange={handleSortChange} />
          {error && <p className="text-rose-500">{error}</p>}
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!initialLoaded && (
              Array.from({ length: 6 }).map((_, i) => <TopicCardSkeleton key={`topic-skel-${i}`} />)
            )}
            {initialLoaded && items.map((t) => (
              <TopicCard
                key={t.id}
                topic={t}
                onDeleted={async () => { loadPage(1, false) }}
              />
            ))}
            {initialLoaded && <div ref={sentinelRef} style={{ height: 32 }} />}
            {initialLoaded && !hasMore && items.length > 0 && (
              <>
                <p className="text-center text-slate-400" style={{ fontSize: 12 }}>{t('common.allLoaded')}</p>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <PrimaryCtaButton to="/topics/add" size="md" iconLeft={<Plus size={16} weight="bold" />}>
                    {t('topics.list.add')}
                  </PrimaryCtaButton>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {t('topics.list.ctaNote')}
                  </Typography>
                </Box>
              </>
            )}
            {initialLoaded && !loading && items.length === 0 && (total === 0 || total === undefined) && (
              <>
                <p className="text-center text-slate-400" style={{ fontSize: 14 }}>{t('topics.list.empty')}</p>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <PrimaryCtaButton to="/topics/add" size="md" iconLeft={<Plus size={16} weight="bold" />}>
                    {t('topics.list.add')}
                  </PrimaryCtaButton>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {t('topics.list.ctaNote')}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </div>
      </main>
      <Footer />
    </div>
  )
}
