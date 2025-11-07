const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export function withBase(url: string): string {
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
    // Always include cookies for session-auth endpoints like /api/me
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GET ${withBase(url)} failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

export async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(withBase(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`POST ${withBase(url)} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function patchJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(withBase(url), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`PATCH ${withBase(url)} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function del(url: string): Promise<void> {
  const res = await fetch(withBase(url), { method: 'DELETE', credentials: 'include' })
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${withBase(url)} failed: ${res.status}`)
}

export type ListResponse<T> = { items: T[]; page?: number; size?: number; total?: number }
export type ItemResponse<T> = { data: T }
