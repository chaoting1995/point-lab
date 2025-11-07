import { useEffect } from 'react'
import { withBase } from '../api/client'

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
        const params = new URLSearchParams(hash)
        const idToken = params.get('id_token')
        const state = params.get('state')
        const expectedState = sessionStorage.getItem('pl:oauth_state')
        // 診斷輸出
        // eslint-disable-next-line no-console
        console.log('[AuthCallback] href=', window.location.href)
        // eslint-disable-next-line no-console
        console.log('[AuthCallback] id_token?', !!idToken, 'state=', state, 'expectedState=', expectedState)
        if (!idToken) {
          alert('未取得 Google 登入回傳（URL 未含 id_token）。請確認 Redirect URI 是否為 /auth/callback。')
          return
        }
      // 交給後端驗證與建立 session（Set-Cookie）
      // 開發階段放寬：暫不送 nonce，先確認 cookie 能設置成功
      const resp = await fetch(withBase('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ idToken, clientId: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID }) })
      const text = await resp.text().catch(()=> '')
      // 調試資訊
      // eslint-disable-next-line no-console
      console.log('[AuthCallback] /api/auth/login status=', resp.status, 'body=', text)
      if (!resp.ok) {
        alert('登入失敗，請把 Console 顯示的訊息貼給我。')
        return
      }
      // 非阻塞地嘗試觸發 /api/me，用於暖身 Session（導頁中斷時忽略）
      try {
        fetch(withBase('/api/me'), { credentials: 'include' })
          .then(()=>{})
          .catch(()=>{})
      } catch {/* ignore */}
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[AuthCallback] unexpected error', e)
      alert('登入流程出錯，請截圖 Console 給我。')
      return
    }
    // 立即導回首頁或上一頁；/api/me 可能被中斷，屬預期
    const back = sessionStorage.getItem('pl:back_after_login') || '/'
    window.location.replace(back)
    })()
  }, [])
  return null
}

// 移除未使用的 decodeJwt（保留於 git 歷史）
