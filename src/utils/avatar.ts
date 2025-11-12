import { withBase } from '../api/client'

const GOOGLE_AVATAR_HOSTS = new Set([
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
])

export function resolveAvatarSrc(url?: string | null) {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (GOOGLE_AVATAR_HOSTS.has(parsed.hostname)) {
      return withBase(`/api/avatar/proxy?url=${encodeURIComponent(url)}`)
    }
  } catch {
    return url || undefined
  }
  return url || undefined
}
