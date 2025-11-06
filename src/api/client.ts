const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

function withBase(url: string): string {
  if (!API_BASE) return url
  if (url.startsWith('http')) return url
  return `${API_BASE.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(withBase(url), {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    credentials: 'omit',
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GET ${withBase(url)} failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

export type ListResponse<T> = { items: T[]; page?: number; size?: number; total?: number }
export type ItemResponse<T> = { data: T }
