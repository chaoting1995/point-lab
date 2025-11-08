const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const SESSION_TOKEN_KEY = 'pl:session_token'
let cachedSessionToken: string | null | undefined

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  if (cachedSessionToken !== undefined) return cachedSessionToken
  try {
    cachedSessionToken = window.localStorage?.getItem(SESSION_TOKEN_KEY) || null
  } catch {
    cachedSessionToken = null
  }
  return cachedSessionToken
}

export function persistSessionToken(token?: string | null) {
  if (typeof window === 'undefined') return
  cachedSessionToken = token || null
  try {
    if (!token) {
      window.localStorage?.removeItem(SESSION_TOKEN_KEY)
    } else {
      window.localStorage?.setItem(SESSION_TOKEN_KEY, token)
    }
  } catch {
    // ignore storage failures (Safari 無痕模式等)
  }
}

export function clearSessionToken() {
  persistSessionToken(null)
}

export function withBase(url: string): string {
  if (!API_BASE) return url
  if (url.startsWith('http')) return url
  return `${API_BASE.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`
}

export function withAuthHeaders(base: Record<string, string> = {}) {
  const headers = { ...base }
  const token = getSessionToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(withBase(url), {
    headers: withAuthHeaders({
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    }),
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
    headers: withAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`POST ${withBase(url)} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function patchJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(withBase(url), {
    method: 'PATCH',
    headers: withAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`PATCH ${withBase(url)} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function del(url: string): Promise<void> {
  const res = await fetch(withBase(url), { method: 'DELETE', credentials: 'include', headers: withAuthHeaders({}) })
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${withBase(url)} failed: ${res.status}`)
}

export type ListResponse<T> = { items: T[]; page?: number; size?: number; total?: number }
export type ItemResponse<T> = { data: T }
