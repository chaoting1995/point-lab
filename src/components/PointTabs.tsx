import { useEffect, useState, useRef, useCallback } from 'react'
import type { Point } from '../data/points'
import { getJson, type ListResponse } from '../api/client'
import useLanguage from '../i18n/useLanguage'
import PointCard from './PointCard'
import SortTabs from './SortTabs'
import type { SortKey } from '../hooks/useSortTabs'
import PrimaryCtaButton from './PrimaryCtaButton'
import { CaretRight } from 'phosphor-react'

type TabKey = SortKey
const tabOrder: TabKey[] = ['new', 'hot', 'old']
const PAGE_SIZE = 20

export default function PointTabs() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabKey>('new')

  // 使用純 CSS sticky，避免抖動

  const [list, setList] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const syncWithHash = () => {
      if (typeof window === 'undefined') return
      const hash = window.location.hash.replace('#', '') as TabKey
      if (tabOrder.includes(hash)) {
        setActiveTab(hash)
        const section = document.querySelector<HTMLDivElement>('#point-tabs')
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    syncWithHash()
    window.addEventListener('hashchange', syncWithHash)
    return () => {
      window.removeEventListener('hashchange', syncWithHash)
    }
  }, [])

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const resp = await getJson<ListResponse<Point>>(
          `/api/points?sort=${activeTab}&page=${nextPage}&size=${PAGE_SIZE}`,
        )
        const items = resp.items || []
        setList((prev) => (append ? [...prev, ...items] : items))
        setPage(nextPage)
        if (typeof resp.total === 'number') {
          setHasMore(nextPage * PAGE_SIZE < resp.total)
        } else {
          setHasMore(items.length === PAGE_SIZE)
        }
        setInitialLoaded(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed')
      } finally {
        setLoading(false)
      }
    },
    [activeTab],
  )

  useEffect(() => {
    setList([])
    setHasMore(true)
    setPage(1)
    loadPage(1, false)
  }, [activeTab, loadPage])

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

  const showLoadingMore = loading && list.length > 0

  return (
    <section className="tabs-card" id="point-tabs">
      <h2 className="tabs__title">觀點列表</h2>
      <SortTabs value={activeTab} onChange={setActiveTab} />
      {!initialLoaded ? (
        <div className="point-grid" role="tabpanel">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`point-skeleton-${idx}`} className="point-card point-card--skeleton" />
          ))}
        </div>
      ) : (
        <>
      {error && <p className="text-center text-rose-500">{t('common.error')}</p>}
          <div className="point-grid" role="tabpanel">
            {list.map((p) => (
              <PointCard
                key={p.id}
                point={p}
                onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
          <div ref={sentinelRef} className="point-tabs__sentinel" />
          {showLoadingMore && (
            <div className="point-grid point-grid--loading" aria-live="polite">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={`point-loading-${idx}`} className="point-card point-card--skeleton" />
              ))}
              <p className="text-center text-slate-500 text-sm w-full" style={{ gridColumn: '1 / -1' }}>
                {t('common.loading')}
              </p>
            </div>
          )}
          {!hasMore && list.length > 0 && (
            <p className="text-center text-slate-400 text-sm py-2">
              {t('common.noMore')}
            </p>
          )}
        </>
      )}
      <div className="tabs__cta">
        <PrimaryCtaButton to="/topics" size="md" className="gap-2 justify-center">
          {t('hero.primaryAction')}
          <CaretRight size={16} weight="bold" />
        </PrimaryCtaButton>
      </div>
    </section>
  )
}
