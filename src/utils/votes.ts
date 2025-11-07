// Centralized localStorage votes management
// Keys per entity to avoid oversized single object
// topics:  pl:votes:topics
// points:  pl:votes:points
// comments:pl:votes:comments

export type Entity = 'topic' | 'point' | 'comment'
type StoreShape = { version?: number; upvotes: string[]; downvotes: string[] }

const KEYS: Record<Entity, string> = {
  topic: 'pl:votes:topics',
  point: 'pl:votes:points',
  comment: 'pl:votes:comments',
}

const LEGACY_PREFIX: Record<Entity, string> = {
  topic: 'pl:tv:',
  point: 'pl:pv:',
  comment: 'pl:cv:',
}

const MAX_PER_LIST = 2000 // hard cap per entity per direction

function safeParse(json: string | null): StoreShape | null {
  if (!json) return null
  try { return JSON.parse(json) as StoreShape } catch { return null }
}

function loadSet(e: Entity): { up: Set<string>; down: Set<string> } {
  try {
    const raw = safeParse(localStorage.getItem(KEYS[e])) || { upvotes: [], downvotes: [] }
    return { up: new Set(raw.upvotes || []), down: new Set(raw.downvotes || []) }
  } catch {
    return { up: new Set(), down: new Set() }
  }
}

function saveSet(e: Entity, { up, down }: { up: Set<string>; down: Set<string> }) {
  try {
    // Trim for safety
    const upArr = Array.from(up).slice(-MAX_PER_LIST)
    const downArr = Array.from(down).slice(-MAX_PER_LIST)
    const obj: StoreShape = { version: 1, upvotes: upArr, downvotes: downArr }
    localStorage.setItem(KEYS[e], JSON.stringify(obj))
  } catch { /* ignore */ }
}

// Compute delta based on prev->next
export function computeDelta(prev: 'up'|'down'|undefined, next: 'up'|'down'|undefined): number {
  if (prev === next) return 0
  const map: Record<string, number> = {
    'undefined->up': +1,
    'undefined->down': -1,
    'up->down': -2,
    'down->up': +2,
    'up->undefined': -1,
    'down->undefined': +1,
  }
  const key = `${String(prev)}->${String(next)}`
  return (map as any)[key] ?? 0
}

export function getVoteState(e: Entity, id: string): 'up'|'down'|undefined {
  const { up, down } = loadSet(e)
  if (up.has(id)) return 'up'
  if (down.has(id)) return 'down'
  return undefined
}

export function setVoteState(e: Entity, id: string, next: 'up'|'down'|undefined): { prev: 'up'|'down'|undefined; next: 'up'|'down'|undefined; delta: number } {
  const s = loadSet(e)
  const prev = s.up.has(id) ? 'up' : (s.down.has(id) ? 'down' : undefined)
  const delta = computeDelta(prev, next)
  if (delta === 0) return { prev, next, delta }
  // mutate sets
  s.up.delete(id)
  s.down.delete(id)
  if (next === 'up') s.up.add(id)
  else if (next === 'down') s.down.add(id)
  saveSet(e, s)
  return { prev, next, delta }
}

let migrated = false
export function migrateLegacyOnce() {
  if (migrated) return
  migrated = true
  try {
    const flag = localStorage.getItem('pl:votes:migrated')
    if (flag === '1') return
    (['topic','point','comment'] as Entity[]).forEach((e) => {
      const s = loadSet(e)
      // scan legacy keys in a best-effort way: iterate localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || ''
        if (!k.startsWith(LEGACY_PREFIX[e])) continue
        const id = k.slice(LEGACY_PREFIX[e].length)
        const v = localStorage.getItem(k) as any
        if (v === 'up') s.up.add(id)
        else if (v === 'down') s.down.add(id)
      }
      saveSet(e, s)
    })
    // cleanup legacy keys (optional, safe best-effort)
    const allKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) allKeys.push(k) }
    allKeys.forEach((k) => { if (k.startsWith('pl:tv:') || k.startsWith('pl:pv:') || k.startsWith('pl:cv:')) { try { localStorage.removeItem(k) } catch {} } })
    localStorage.setItem('pl:votes:migrated','1')
  } catch {/* ignore */}
}

