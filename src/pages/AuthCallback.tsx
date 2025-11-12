import { useEffect } from 'react'
import { persistSessionToken, withAuthHeaders, withBase } from '../api/client'

export default function AuthCallback() {
  useEffect(() => {
    const decodeStatePayload = (value: string | null) => {
      if (!value) return null
      try {
        const decoded = typeof window !== 'undefined'
          ? decodeURIComponent(window.atob(value))
          : decodeURIComponent(atob(value))
        const obj = JSON.parse(decoded)
        if (obj && typeof obj === 'object') return obj as { token?: string; backUrl?: string }
      } catch {}
      return null
    }
    ;(async () => {
      let shouldRedirect = false
      let backFromState: string | undefined
      try {
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
        const params = new URLSearchParams(hash)
        const idToken = params.get('id_token')
        const state = params.get('state')
        const expectedStateToken = sessionStorage.getItem('pl:oauth_state')
        const parsedState = decodeStatePayload(state)
        if (parsedState?.backUrl && typeof parsedState.backUrl === 'string') {
          backFromState = parsedState.backUrl
        }
        const incomingToken = typeof parsedState?.token === 'string' ? parsedState.token : null
        if (!idToken) {
          alert('未取得 Google 登入回傳（URL 未含 id_token）。請確認 Redirect URI 是否為 /auth/callback。')
          return
        }
        if (expectedStateToken && incomingToken && incomingToken !== expectedStateToken) {
          alert('登入驗證狀態不符，請重新嘗試一次（可能是頁面重複開啟或快取造成）。')
          return
        }
        // 向下相容：舊 state 格式（純亂數字串）
        if (!incomingToken && expectedStateToken && state && state !== expectedStateToken) {
          alert('登入驗證狀態不符，請重新嘗試一次（可能是頁面重複開啟或快取造成）。')
          return
        }
        try { sessionStorage.removeItem('pl:oauth_state') } catch {}
        // 交給後端驗證與建立 session（Set-Cookie）
        const resp = await fetch(withBase('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idToken, clientId: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID }),
        })
        const text = await resp.text().catch(()=> '')
        if (!resp.ok) {
          alert('登入失敗，請把 Console 顯示的訊息貼給我。')
          return
        }
        try {
          const parsed = text ? JSON.parse(text) : null
          const token = parsed?.data?.sessionToken || parsed?.sessionToken
          if (token) persistSessionToken(token)
        } catch {
          // 若 JSON 格式不符，忽略，後續請求仍可依賴 Cookie
        }
        shouldRedirect = true
        // 非阻塞地嘗試觸發 /api/me，用於暖身 Session（導頁中斷時忽略）
        try {
          fetch(withBase('/api/me'), { credentials: 'include', headers: withAuthHeaders({}) })
            .then(()=>{})
            .catch(()=>{})
        } catch {/* ignore */}
      } catch (e) {
        alert('登入流程出錯，請截圖 Console 給我。')
        return
      } finally {
        if (!shouldRedirect) return
        // 立即導回首頁或上一頁；/api/me 可能被中斷，屬預期
        let back = '/'
        if (backFromState) {
          back = backFromState
          try { sessionStorage.removeItem('pl:back_after_login') } catch {}
        } else {
          try {
            back = sessionStorage.getItem('pl:back_after_login') || '/'
            sessionStorage.removeItem('pl:back_after_login')
          } catch {}
        }
        window.location.replace(back)
      }
    })()
  }, [])
  return null
}

// 移除未使用的 decodeJwt（保留於 git 歷史）
