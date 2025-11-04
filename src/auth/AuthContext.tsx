import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type User = {
  name?: string
  email?: string
  picture?: string
  credential?: string
}

type AuthContextValue = {
  user: User | null
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(s)
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('pl:user')
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (user) localStorage.setItem('pl:user', JSON.stringify(user))
      else localStorage.removeItem('pl:user')
    } catch {}
  }, [user])

  const login = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) {
      // fallback：無設定 client id 就先示範登入狀態
      setUser({ name: 'Guest', email: 'guest@example.com' })
      return
    }
    await loadGoogleScript()
    await new Promise<void>((resolve, reject) => {
      try {
        const google = (window as any).google
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            const credential = resp?.credential as string | undefined
            try {
              const payload = credential ? decodeJwt(credential) : null
              setUser({
                credential,
                name: payload?.name,
                email: payload?.email,
                picture: payload?.picture,
              })
            } catch {
              setUser({ credential })
            }
            resolve()
          },
        })
        // 使用 One Tap，或可改 renderButton 浮層
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // 無法顯示就降級為按鈕流程
            const btn = document.createElement('div')
            document.body.appendChild(btn)
            google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large' })
          }
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  const logout = () => setUser(null)

  const value = useMemo(() => ({ user, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function decodeJwt(token: string): any | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}
