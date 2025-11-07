type Kind = 'topic' | 'point' | 'comment'
type Item = { id: string; ts: number }

const KEY: Record<Kind, string> = {
  topic: 'pl:guest:topics',
  point: 'pl:guest:points',
  comment: 'pl:guest:comments',
}

const LIMIT = 2000

function load(kind: Kind): Item[] {
  try { return JSON.parse(localStorage.getItem(KEY[kind]) || '[]') as Item[] } catch { return [] }
}
function save(kind: Kind, list: Item[]) {
  try { localStorage.setItem(KEY[kind], JSON.stringify(list.slice(-LIMIT))) } catch {}
}

export function addGuestItem(kind: Kind, id: string) {
  try {
    const arr = load(kind).filter(x => x.id !== id)
    arr.push({ id, ts: Date.now() })
    save(kind, arr)
  } catch {/* ignore */}
}

export function listGuestItems(kind: Kind): Item[] {
  return load(kind)
}

