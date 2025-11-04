import { useEffect, useRef, useState } from 'react'
import type { ListResponse } from '../api/client'
import type { SortKey } from './useSortTabs'

export function usePagedList<T>(opts: {
  initialSort: SortKey
  pageSize?: number
  getPage: (page: number, size: number, sort: SortKey) => Promise<ListResponse<T>>
  getKey?: (item: T) => string
}) {
  const { initialSort, pageSize = 30, getKey = (item: any) => String(item?.id ?? '') } = opts
  const getPageRef = useRef(opts.getPage)
  // 更新最新的 getPage，避免依賴導致重跑
  useEffect(() => {
    getPageRef.current = opts.getPage
  }, [opts.getPage])
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [sort, setSortRaw] = useState<SortKey>(initialSort)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [firstPageDone, setFirstPageDone] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const seenKeysRef = useRef<Set<string>>(new Set())

  // Load pages incrementally
  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const resp = await getPageRef.current(page, pageSize, sort)
        if (aborted) return
        setItems((prev) => {
          // 第一頁時以回傳覆蓋，避免嚴格模式或重入造成的暫時性空白
          const base: T[] = page === 1 ? [] : [...prev]
          const out: T[] = base
          for (const it of resp.items || []) {
            const k = getKey(it)
            if (!seenKeysRef.current.has(k)) {
              seenKeysRef.current.add(k)
              out.push(it)
            }
          }
          return out
        })
        const tot = (resp as any).total as number | undefined
        if (typeof tot === 'number') {
          setTotal(tot)
          setHasMore(page * pageSize < tot)
        } else {
          setHasMore((resp.items || []).length === pageSize)
        }
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (!aborted) {
          setLoading(false)
          if (page === 1) setFirstPageDone(true)
        }
      }
    }
    run()
    return () => {
      aborted = true
    }
  }, [page, sort, pageSize])

  // Reset when sort changes
  const setSort = (v: SortKey) => {
    setSortRaw(v)
    setItems([])
    setPage(1)
    setHasMore(true)
    seenKeysRef.current.clear()
    setFirstPageDone(false)
  }

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !loading && hasMore && (firstPageDone || page > 1)) {
        setPage((p) => p + 1)
      }
    }, { rootMargin: '200px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loading, hasMore, firstPageDone, page])

  return { items, loading, error, hasMore, total, sort, setSort, sentinelRef, firstPageDone }
}
