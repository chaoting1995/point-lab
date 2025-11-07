export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem('pl:guest:id')
    if (!id) {
      id = 'g-' + cryptoRandomId()
      localStorage.setItem('pl:guest:id', id)
    }
    return id
  } catch {
    return 'g-' + cryptoRandomId()
  }
}

export function getGuestName(): string | null {
  try { return localStorage.getItem('pl:guestName') } catch { return null }
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

