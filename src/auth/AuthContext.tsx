import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { withBase } from '../api/client'

type User = {
  id?: string
  name?: string
  email?: string
  picture?: string
  credential?: string
  role?: 'user' | 'admin' | 'superadmin'
}

type AuthContextValue = {
  user: User | null
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// 移除未使用的 Google script 載入器（保留於 git 歷史）

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let aborted = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      const delays = [0, 250, 600] // 輕量重試，降低初始 401 閃爍
      for (let i = 0; i < delays.length; i++) {
        if (aborted) return
        if (delays[i]) await sleep(delays[i])
        try {
          const r = await fetch(withBase('/api/me'), { credentials: 'include' })
          if (!r.ok) continue
          const data = await r.json()
          if (!aborted && data?.data) {
            const d = data.data as any
            const role = d.role || ((d.id === 'u-1762500221827' || d.email === 'chaoting666@gmail.com') ? 'superadmin' : 'user')
            setUser({ ...d, role })
          }
          break
        } catch {}
      }
    })()
    return () => { aborted = true }
  }, [])

  const login = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) {
      setUser({ name: 'Guest', email: 'guest@example.com' })
      return
    }
    const origin = window.location.origin
    const redirectUri = (import.meta.env.VITE_GOOGLE_REDIRECT_URI as string | undefined) || `${origin}/auth/callback`
    const state = Math.random().toString(36).slice(2)
    const nonce = Math.random().toString(36).slice(2)
    try { sessionStorage.setItem('pl:oauth_state', state); sessionStorage.setItem('pl:oauth_nonce', nonce) } catch {}
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      state,
      nonce,
      prompt: 'select_account',
    })
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    window.location.assign(url)
  }

  const logout = () => {
    fetch(withBase('/api/auth/logout'), { method: 'POST', credentials: 'include' }).finally(() => setUser(null))
  }

  const value = useMemo(() => ({ user, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// 移除未使用的 decodeJwt（保留於 git 歷史）
