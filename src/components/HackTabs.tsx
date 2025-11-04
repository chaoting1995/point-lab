import { useEffect, useState } from 'react'
import type { Point } from '../data/points'
import { getJson, type ListResponse } from '../api/client'
import useLanguage from '../i18n/useLanguage'
import PointCard from './PointCard'
import Box from '@mui/material/Box'
import SortTabs from './SortTabs'
import type { SortKey } from '../hooks/useSortTabs'

type TabKey = SortKey
const tabOrder: TabKey[] = ['new', 'hot', 'old']

export function HackTabs() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabKey>('new')
  const [headerTop, setHeaderTop] = useState(56)

  useEffect(() => {
    const calc = () => {
      const h = document.querySelector<HTMLElement>('.header')
      const hh = h ? h.getBoundingClientRect().height : 56
      setHeaderTop(Math.max(0, Math.floor(hh)))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

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
        <div className="hack-grid" role="tabpanel">
          {list.map((hack) => (
            <PointCard key={hack.id} point={hack} />
          ))}
        </div>
      )}
    </section>
  )
}

export default HackTabs
