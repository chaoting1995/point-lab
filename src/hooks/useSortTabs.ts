export type SortKey = 'new' | 'hot' | 'old'

export function useSortTabs(initial: SortKey = 'new') {
  // 小型 hook：提供排序鍵與可選的 hash 同步
  const valueFromHash = (): SortKey | null => {
    if (typeof window === 'undefined') return null
    const h = window.location.hash?.replace('#', '') as SortKey
    return h === 'new' || h === 'hot' || h === 'old' ? h : null
  }

  const start = valueFromHash() ?? initial
  let current = start
  const listeners = new Set<(v: SortKey) => void>()

  const set = (v: SortKey) => {
    current = v
    // 不強制寫入 hash，保留呼叫端決定
    listeners.forEach((fn) => fn(v))
  }

  const subscribe = (fn: (v: SortKey) => void) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  return { get value() { return current }, set, subscribe }
}

