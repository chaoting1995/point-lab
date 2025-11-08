const KEY = 'pl:guest'

type GuestStore = { id: string; name?: string | null }

export function getOrCreateGuestId(): string {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const obj = JSON.parse(raw) as GuestStore
      if (obj?.id) return obj.id
    }
    const id = 'g-' + cryptoRandomId()
    saveGuest({ id })
    return id
  } catch {
    return 'g-' + cryptoRandomId()
  }
}

export function getGuestName(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as GuestStore
    return obj?.name || null
  } catch { return null }
}

export function saveGuestName(name: string) {
  try {
    const raw = localStorage.getItem(KEY)
    const id = raw ? ((JSON.parse(raw) as GuestStore).id || getOrCreateGuestId()) : getOrCreateGuestId()
    saveGuest({ id, name })
  } catch { /* ignore */ }
}

function saveGuest(v: GuestStore) {
  try { localStorage.setItem(KEY, JSON.stringify({ id: v.id, name: v.name ?? null })) } catch { /* ignore */ }
}

function cryptoRandomId(): string {
  try {
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('')
  } catch {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  }
}
