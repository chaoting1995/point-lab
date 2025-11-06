import { useEffect, useState } from 'react'
import type { Point } from '../data/points'
import { getJson, type ListResponse } from '../api/client'
import useLanguage from '../i18n/useLanguage'
import PointCard from './PointCard'
import SortTabs from './SortTabs'
import type { SortKey } from '../hooks/useSortTabs'

type TabKey = SortKey
const tabOrder: TabKey[] = ['new', 'hot', 'old']

export default function PointTabs() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabKey>('new')

  // 使用純 CSS sticky，避免抖動

  const [list, setList] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const resp = await getJson<ListResponse<Point>>(`/api/points?sort=${activeTab}`)
        if (!aborted) setList(resp.items)
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    run()
    return () => {
      aborted = true
    }
  }, [activeTab])

  return (
    <section className="layout-card tabs-card" id="point-tabs">
      <SortTabs value={activeTab} onChange={setActiveTab} />
      <p className="tabs__hint text-slate-500 text-sm text-center mb-2">{t('tabs.hint')}</p>
      {loading && <p className="text-center text-slate-500">{t('common.loading')}</p>}
      {error && <p className="text-center text-rose-500">{t('common.error')}</p>}
      {!loading && !error && (
        <div className="point-grid" role="tabpanel">
          {list.map((p) => (
            <PointCard
              key={p.id}
              point={p}
              onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </section>
  )
}
