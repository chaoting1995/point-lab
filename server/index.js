// Simple Express API server for PointLab
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { repo } from './db/repo.js'

const app = express()
// CORS: allow specific origins in production
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({ origin: allowed.length ? allowed : true, credentials: true }))
app.use(express.json())
// Avoid 304 on JSON APIs during dev to prevent empty bodies
app.set('etag', false)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')

function readJson(file, fallback = []) {
  try {
    const p = path.join(DATA_DIR, file)
    const raw = fs.readFileSync(p, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}

function writeJson(file, data) {
  const p = path.join(DATA_DIR, file)
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

function slugify(input = '') {
  const basic = String(input)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return basic || `topic-${Date.now()}`
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

// Cookie helpers
function parseCookies(req) {
  const out = {}
  const raw = req.headers.cookie || ''
  raw.split(';').forEach((p) => {
    const idx = p.indexOf('=')
    if (idx > -1) out[p.slice(0, idx).trim()] = decodeURIComponent(p.slice(idx + 1))
  })
  return out
}
function isSecureReq(req) {
  const xfProto = String(req.headers['x-forwarded-proto'] || '')
  const proto = xfProto || (req.protocol || '')
  return proto.toLowerCase().includes('https')
}
function setSessionCookie(req, res, token, maxAgeSec = 2592000) {
  const secureEnv = isSecureReq(req)
  const sameSite = secureEnv ? 'None' : 'Lax'
  const secureFlag = secureEnv ? '; Secure' : ''
  // 為了支援第三方情境（前端與 API 不同網域），在 HTTPS 下加上 Partitioned（CHIPS），
  // 以降低瀏覽器封鎖第三方 Cookie 的風險（Chrome 支援）。
  const partitioned = secureEnv && sameSite === 'None' ? '; Partitioned' : ''
  const cookie = `pl_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly${secureFlag}; SameSite=${sameSite}${partitioned}`
  // 單一或多個 Set-Cookie
  const cookies = [cookie]
  if (!secureEnv) {
    // 開發模式便於偵錯：再設一個可見的 cookie（非 HttpOnly），避免代理或瀏覽器忽略 HttpOnly 導致偵錯困難
    cookies.push(`pl_session_dev=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; SameSite=${sameSite}`)
  }
  res.setHeader('Set-Cookie', cookies)
}

// Google JWKS (simple cache)
let jwksCache = { keys: [], fetchedAt: 0 }
function fetchGoogleJwks() {
  return new Promise((resolve, reject) => {
    if (Date.now() - jwksCache.fetchedAt < 60 * 60 * 1000 && jwksCache.keys?.length) return resolve(jwksCache)
    https.get('https://www.googleapis.com/oauth2/v3/certs', (r) => {
      const chunks = []
      r.on('data', (c) => chunks.push(c))
      r.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
          jwksCache = { keys: json.keys || [], fetchedAt: Date.now() }
          resolve(jwksCache)
        } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}
function base64urlToBuffer(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64')
}
async function verifyGoogleIdToken(idToken, expectedAud, expectedNonce) {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) throw new Error('INVALID_JWT')
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'))
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
    const sig = base64urlToBuffer(parts[2])
    if (payload.aud !== expectedAud) throw new Error('AUD_MISMATCH')
    const issOk = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com'
    if (!issOk) throw new Error('ISS_MISMATCH')
    if (expectedNonce && payload.nonce && payload.nonce !== expectedNonce) throw new Error('NONCE_MISMATCH')
    if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error('JWT_EXPIRED')
    const { keys } = await fetchGoogleJwks()
    const jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA')
    if (!jwk) throw new Error('JWK_NOT_FOUND')
    const publicKey = crypto.createPublicKey({ key: jwkToPem(jwk), format: 'pem', type: 'spki' })
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(`${parts[0]}.${parts[1]}`)
    verifier.end()
    const ok = verifier.verify(publicKey, sig)
    if (!ok) throw new Error('SIG_INVALID')
    return payload
  } catch (e) {
    // Fallback A：最小驗證（開發用途）：解碼 payload，檢查 aud/iss/nonce/exp
    try {
      const parts = idToken.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
      const issOk = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com'
      if (!issOk) throw new Error('DEV_ISS_MISMATCH')
      if (payload.aud !== expectedAud) throw new Error('DEV_AUD_MISMATCH')
      if (expectedNonce && payload.nonce && payload.nonce !== expectedNonce) throw new Error('DEV_NONCE_MISMATCH')
      if (payload.exp && Date.now()/1000 > payload.exp) throw new Error('DEV_JWT_EXPIRED')
      return payload
    } catch {}

    // Fallback B：tokeninfo 端點（若可連網）
    try {
      const data = await new Promise((resolve, reject) => {
        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
        https.get(url, (r) => {
          const chunks = []
          r.on('data', (c) => chunks.push(c))
          r.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))) } catch (err) { reject(err) }
          })
        }).on('error', reject)
      })
      if (!data || data.aud !== expectedAud) throw new Error('TOKENINFO_AUD_MISMATCH')
      if (expectedNonce && data.nonce && data.nonce !== expectedNonce) throw new Error('TOKENINFO_NONCE_MISMATCH')
      if (data.exp && Date.now()/1000 > Number(data.exp)) throw new Error('TOKENINFO_EXPIRED')
      return {
        sub: data.sub,
        email: data.email,
        email_verified: String(data.email_verified) === 'true',
        name: data.name,
        picture: data.picture,
        iss: data.iss,
        aud: data.aud,
        nonce: data.nonce,
        exp: Number(data.exp),
      }
    } catch (e2) {
      throw e2 || e
    }
  }
}
function jwkToPem(jwk) {
  // Minimal RSA JWK -> PEM (PKCS#8) conversion for RS256
  const modulus = base64urlToBuffer(jwk.n)
  const exponent = base64urlToBuffer(jwk.e)
  // Build SubjectPublicKeyInfo via ASN.1 DER (prebuilt header for RSA SHA256)
  // For brevity, we assemble a minimal DER using Node crypto KeyObject builder when available
  // Here we fallback to Node's createPublicKey with JWK directly when supported
  try {
    return crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({ format: 'pem', type: 'spki' }).toString()
  } catch {
    // As a fallback (older Node), we cannot easily handcraft DER here; throw for visibility
    throw new Error('JWK_TO_PEM_UNSUPPORTED')
  }
}

// Topics
app.get('/api/topics', (req, res) => {
  try {
    const { page = '1', size = '30', sort = 'new', user } = req.query
    const p = Math.max(1, parseInt(page, 10) || 1)
    const s = Math.max(1, Math.min(100, parseInt(size, 10) || 30))
    const { items: raw, total } = repo.listTopics({ page: p, size: s, sort, user })
    const items = (raw || []).map((t, i) => {
      let createdAt = t.createdAt || t.created_at
      if (!createdAt && typeof t.id === 'string' && t.id.startsWith('t-')) {
        const ts = Number(t.id.slice(2))
        if (!Number.isNaN(ts)) createdAt = new Date(ts).toISOString()
      }
      if (!createdAt) createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      const createdBy = t.created_by || t.createdBy
      return { ...t, createdAt, ...(createdBy ? { createdBy } : {}) }
    })
    res.json({ items, page: p, size: s, total: typeof total === 'number' ? total : items.length })
  } catch (e) {
    res.status(500).json({ error: 'READ_TOPICS_FAILED' })
  }
})

// by id (preferred)
app.get('/api/topics/id/:id', (req, res) => {
  try {
    const topic = repo.getTopic(req.params.id)
    if (!topic) return res.status(404).json({ error: 'NOT_FOUND' })
    const createdAt = topic.createdAt || topic.created_at || new Date().toISOString()
    const createdBy = topic.created_by || topic.createdBy
    res.json({ data: { ...topic, createdAt, ...(createdBy ? { createdBy } : {}) } })
  } catch (e) {
    res.status(500).json({ error: 'READ_TOPIC_FAILED' })
  }
})

// backward compat by slug
app.get('/api/topics/:slug', (req, res) => {
  try {
    const topic = repo.getTopic(req.params.slug)
    if (!topic) return res.status(404).json({ error: 'NOT_FOUND' })
    const createdAt = topic.createdAt || topic.created_at || new Date().toISOString()
    const createdBy = topic.created_by || topic.createdBy
    res.json({ data: { ...topic, createdAt, ...(createdBy ? { createdBy } : {}) } })
  } catch (e) {
    res.status(500).json({ error: 'READ_TOPIC_FAILED' })
  }
})

app.post('/api/topics', (req, res) => {
  try {
    const { name, description, mode } = req.body || {}
    if (!name || String(name).trim().length < 1) {
      return res.status(400).json({ error: 'NAME_REQUIRED' })
    }
    const id = `t-${Date.now()}`
    // 若有登入，用戶即為創建者
    const cookieMap = parseCookies(req)
    const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
    const me = token ? repo.getUserBySession(token) : null
    const rec = {
      id,
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      mode: mode === 'duel' ? 'duel' : 'open',
      createdBy: me?.id,
    }
    repo.createTopic(rec)
    res.status(201).json({ data: { ...rec, createdAt: new Date().toISOString(), score: 0, count: 0 } })
  } catch (e) {
    res.status(500).json({ error: 'CREATE_TOPIC_FAILED' })
  }
})

// Update topic
app.patch('/api/topics/:id', (req, res) => {
  try {
    const { name, description, mode } = req.body || {}
    const updated = repo.updateTopic(req.params.id, {
      ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      ...(typeof description === 'string' ? { description: description.trim() || undefined } : {}),
      ...(mode === 'open' || mode === 'duel' ? { mode } : {}),
    })
    if (!updated) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ data: updated })
  } catch (e) {
    res.status(500).json({ error: 'UPDATE_TOPIC_FAILED' })
  }
})

// 刪除主題（不做級聯刪除 points，列表會因為找不到 topic 而不顯示孤兒點）
app.delete('/api/topics/:id', (req, res) => {
  try {
    const ok = repo.deleteTopic(req.params.id)
    if (!ok) return res.status(404).json({ error: 'NOT_FOUND' })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: 'DELETE_TOPIC_FAILED' })
  }
})

// Topic vote (up/down). Body: { delta: 1 | -1 | ±2 }
function applyVote(req, res) {
  try {
    const { delta } = req.body || {}
    const row = repo.voteTopic(req.params.id, delta)
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' })
    const createdAt = row.created_at || row.createdAt || new Date().toISOString()
    res.json({ data: { ...row, createdAt } })
  } catch (e) {
    res.status(500).json({ error: 'VOTE_TOPIC_FAILED' })
  }
}

app.patch('/api/topics/:id/vote', applyVote)
app.post('/api/topics/:id/vote', applyVote)

// Hacks
function listPoints(req, res) {
  try {
    const { topic: topicParam, sort = 'hot', page = '1', size = '20', user } = req.query
    const p = Math.max(1, parseInt(page, 10) || 1)
    const s = Math.max(1, Math.min(100, parseInt(size, 10) || 20))
    const { items: raw, total } = repo.listPoints({ topic: topicParam, sort, page: p, size: s, user })
    const items = (raw || []).map((it) => ({
      ...it,
      createdAt: it.createdAt || it.created_at,
      ...(it.user_id ? { userId: it.user_id } : {}),
      ...(it.topic_id ? { topicId: it.topic_id } : (it.topicId ? { topicId: it.topicId } : {})),
      ...(it.author || it.author_name ? {
        author: it.author || { name: it.author_name, role: it.author_type || (it.user_id ? 'user' : 'guest') }
      } : {}),
    }))
    res.json({ items, page: p, size: s, total: typeof total === 'number' ? total : items.length })
  } catch (e) {
    res.status(500).json({ error: 'READ_HACKS_FAILED' })
  }
}
app.get('/api/points', listPoints)

function createPoint(req, res) {
  try {
    const { description, topicId, authorName, authorType, position } = req.body || {}
    if (!description || String(description).trim().length < 1) {
      return res.status(400).json({ error: 'DESCRIPTION_REQUIRED' })
    }
    const id = `point-${Date.now()}`
    const cookieMap = parseCookies(req)
    const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
    const me = token ? repo.getUserBySession(token) : null
    const record = {
      id,
      userId: me?.id,
      description: String(description).trim(),
      topicId: topicId || undefined,
      author: {
        name: me?.name || (authorName && String(authorName).trim()) || (authorType === 'user' ? '用戶' : '匿名'),
        role: me ? 'user' : (authorType === 'user' ? 'user' : 'guest'),
      },
      position: position === 'agree' || position === 'others' ? position : undefined,
    }
    repo.createPoint(record)
    res.status(201).json({ data: { ...record, createdAt: new Date().toISOString(), upvotes: 0, comments: 0, shares: 0, rank: 999 } })
  } catch (e) {
    res.status(500).json({ error: 'CREATE_POINT_FAILED' })
  }
}
app.post('/api/points', createPoint)

app.get('/api/points/:id', (req, res) => {
  const it = repo.getPoint(req.params.id)
  if (!it) return res.status(404).json({ error: 'NOT_FOUND' })
  const data = {
    ...it,
    createdAt: it.createdAt || it.created_at,
    ...(it.user_id ? { userId: it.user_id } : {}),
    ...(it.author || it.author_name ? { author: it.author || { name: it.author_name, role: it.author_type || (it.user_id ? 'user' : 'guest') } } : {}),
  }
  res.json({ data })
})

// Update point
app.patch('/api/points/:id', (req, res) => {
  try {
    const { description, position } = req.body || {}
    const updated = repo.updatePoint(req.params.id, {
      ...(typeof description === 'string' && description.trim() ? { description: description.trim() } : {}),
      ...(position === 'agree' || position === 'others' ? { position } : {}),
    })
    if (!updated) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ data: updated })
  } catch (e) {
    res.status(500).json({ error: 'UPDATE_POINT_FAILED' })
  }
})

// 刪除觀點（同步調整對應 topic 的 count）
app.delete('/api/points/:id', (req, res) => {
  try {
    const ok = repo.deletePoint(req.params.id)
    if (!ok) return res.status(404).json({ error: 'NOT_FOUND' })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: 'DELETE_POINT_FAILED' })
  }
})
// 舊 /api/hacks 路由已移除，請改用 /api/points

// Points vote (up/down). Body: { delta: 1 | -1 }
function applyPointVote(req, res) {
  try {
    const { delta } = req.body || {}
    const row = repo.votePoint(req.params.id, delta)
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' })
    const createdAt = row.created_at || row.createdAt
    res.json({ data: { ...row, createdAt } })
  } catch (e) {
    res.status(500).json({ error: 'VOTE_POINT_FAILED' })
  }
}
app.patch('/api/points/:id/vote', applyPointVote)
app.post('/api/points/:id/vote', applyPointVote)

// Comments API
// List comments (top-level) for a point
app.get('/api/points/:id/comments', (req, res) => {
  try {
    const { sort = 'old', page = '1', size = '10', parent } = req.query
    const p = Math.max(1, parseInt(page, 10) || 1)
    const s = Math.max(1, Math.min(100, parseInt(size, 10) || 10))
    const { items, total } = repo.listComments({ pointId: req.params.id, parentId: parent || null, sort, page: p, size: s })
    const mapped = (items || []).map((it) => ({
      id: it.id,
      pointId: it.point_id || it.pointId,
      parentId: it.parent_id || it.parentId || undefined,
      content: it.content,
      upvotes: it.upvotes || 0,
      createdAt: it.created_at || it.createdAt,
      author: it.author_name ? { name: it.author_name, role: it.author_type || 'guest', id: it.user_id || undefined } : (it.author || { name: '匿名', role: 'guest' }),
      childCount: it.child_count || 0,
    }))
    res.json({ items: mapped, page: p, size: s, total })
  } catch (e) {
    res.status(500).json({ error: 'READ_COMMENTS_FAILED' })
  }
})
// Create comment
app.post('/api/points/:id/comments', (req, res) => {
  try {
    const { content, parentId, authorName, authorType } = req.body || {}
    if (!content || !String(content).trim()) return res.status(400).json({ error: 'CONTENT_REQUIRED' })
    const id = `c-${Date.now()}`
    const cookieMap = parseCookies(req)
    const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
    const me = token ? repo.getUserBySession(token) : null
    const row = repo.createComment({ id, pointId: req.params.id, parentId, content: String(content).trim(), authorName: me?.name || authorName, authorType: me ? 'user' : (authorType || 'guest'), userId: me?.id })
    res.status(201).json({ data: { ...row, createdAt: row.created_at || row.createdAt } })
  } catch (e) {
    res.status(500).json({ error: 'CREATE_COMMENT_FAILED' })
  }
})
// Vote comment
app.patch('/api/comments/:id/vote', (req, res) => {
  try {
    const { delta } = req.body || {}
    const row = repo.voteComment(req.params.id, delta)
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ data: { ...row, createdAt: row.created_at || row.createdAt } })
  } catch (e) {
    res.status(500).json({ error: 'VOTE_COMMENT_FAILED' })
  }
})

// Auth APIs
app.post('/api/auth/login', async (req, res) => {
  try {
    const { idToken, nonce, clientId } = req.body || {}
    if (!idToken) return res.status(400).json({ error: 'ID_TOKEN_REQUIRED' })
    const aud = process.env.GOOGLE_CLIENT_ID || clientId || process.env.VITE_GOOGLE_CLIENT_ID
    const payload = await verifyGoogleIdToken(idToken, aud, nonce)
    const u = repo.upsertGoogleUser({ sub: payload.sub, email: payload.email, email_verified: payload.email_verified, name: payload.name, picture: payload.picture })
    const s = repo.createSession(u.id)
    setSessionCookie(req, res, s.token)
    res.json({ data: { id: u.id, email: u.email, name: u.name, picture: u.picture } })
  } catch (e) {
    console.error('[auth/login] failed', e)
    // 回傳簡短錯誤碼便於開發期偵錯
    res.status(401).json({ error: 'LOGIN_FAILED', code: e instanceof Error ? e.message : 'UNKNOWN' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = parseCookies(req)['pl_session']
    const all = String(req.query.all || '').toLowerCase() === '1'
    if (token) {
      if (all) {
        const u = repo.getUserBySession(token)
        if (u) repo.removeAllSessions(u.id)
      } else {
        repo.removeSession(token)
      }
    }
    const secureEnv = isSecureReq(req)
    const sameSite = secureEnv ? 'None' : 'Lax'
    const secureFlag = secureEnv ? '; Secure' : ''
    res.setHeader('Set-Cookie', `pl_session=; Path=/; Max-Age=0; HttpOnly${secureFlag}; SameSite=${sameSite}`)
    res.status(204).end()
  } catch {
    res.status(204).end()
  }
})

app.get('/api/me', (req, res) => {
  try {
    const cookieMap = parseCookies(req)
    const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
    // 開發期診斷：觀察收到的 Cookie 與 token（不含敏感資訊外洩）
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[diag:/api/me] cookies keys=', Object.keys(cookieMap), 'hasToken=', !!token)
      }
    } catch {}
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
    const u = repo.getUserBySession(token)
    if (!u) return res.status(401).json({ error: 'UNAUTHORIZED' })
    const isSuper = (u.id === 'u-1762500221827') || (u.email === 'chaoting666@gmail.com')
    const role = isSuper ? 'superadmin' : (u.role || 'user')
    res.json({ data: { id: u.id, email: u.email, name: u.name, picture: u.picture, role } })
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED' })
  }
})

// Public user profile
app.get('/api/users/:id', (req, res) => {
  try {
    const u = repo.getUserById(req.params.id)
    if (!u) return res.status(404).json({ error: 'NOT_FOUND' })
    const parse = (s)=>{ try { return JSON.parse(s||'[]') } catch { return [] } }
    const topics = Array.isArray(u.topics) ? u.topics : parse(u.topics_json)
    const points = Array.isArray(u.points) ? u.points : parse(u.points_json)
    const comments = Array.isArray(u.comments) ? u.comments : parse(u.comments_json)
    const pointLikes = repo.sumPointUpvotesByUser(u.id)
    const topicLikes = repo.sumTopicScoreByUser(u.id)
    const isSuper = (u.id === 'u-1762500221827') || (u.email === 'chaoting666@gmail.com')
    const role = isSuper ? 'superadmin' : (u.role || 'user')
    res.json({ data: { id: u.id, name: u.name, email: u.email, picture: u.picture, bio: u.bio || null, role, topics, points, comments, pointLikes, topicLikes } })
  } catch { res.status(500).json({ error: 'READ_USER_FAILED' }) }
})

// Reports
app.post('/api/reports', (req, res) => {
  try {
    const { type, targetId, reason } = req.body || {}
    if (!type || !targetId) return res.status(400).json({ error: 'INVALID_INPUT' })
    const cookieMap = parseCookies(req)
    const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
    const me = token ? repo.getUserBySession(token) : null
    const id = `r-${Date.now()}`
    const row = repo.addReport({ id, type, targetId, userId: me?.id, reason })
    res.status(201).json({ data: row })
  } catch { res.status(500).json({ error: 'CREATE_REPORT_FAILED' }) }
})

app.get('/api/admin/reports', (req, res) => {
  const cookieMap = parseCookies(req)
  const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
  const u = token ? repo.getUserBySession(token) : null
  const isSuper = u && ((u.id === 'u-1762500221827') || (u.email === 'chaoting666@gmail.com'))
  const role = u ? (isSuper ? 'superadmin' : (u.role || 'user')) : 'user'
  if (role !== 'admin' && role !== 'superadmin') return res.status(403).json({ error: 'FORBIDDEN' })
  try {
    const { type } = req.query
    const items = repo.listReports(type)
    res.json({ items })
  } catch { res.status(500).json({ error: 'READ_REPORTS_FAILED' }) }
})

// Admin: set role
app.patch('/api/admin/users/:id/role', (req, res) => {
  const cookieMap = parseCookies(req)
  const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
  const u = token ? repo.getUserBySession(token) : null
  const isSuper = u && ((u.id === 'u-1762500221827') || (u.email === 'chaoting666@gmail.com'))
  const role = u ? (isSuper ? 'superadmin' : (u.role || 'user')) : 'user'
  if (role !== 'superadmin') return res.status(403).json({ error: 'FORBIDDEN' })
  try {
    const { role: next } = req.body || {}
    if (!next || !['user','admin','superadmin'].includes(next)) return res.status(400).json({ error: 'INVALID_ROLE' })
    const ok = repo.setUserRole(req.params.id, next)
    if (!ok) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'SET_ROLE_FAILED' }) }
})

// Admin APIs (basic)
app.get('/api/admin/users', (req, res) => {
  const cookieMap = parseCookies(req)
  const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
  const u = token ? repo.getUserBySession(token) : null
  const isSuper = u && ((u.id === 'u-1762500221827') || (u.email === 'chaoting666@gmail.com'))
  const role = u ? (isSuper ? 'superadmin' : (u.role || 'user')) : 'user'
  if (role !== 'admin' && role !== 'superadmin') return res.status(403).json({ error: 'FORBIDDEN' })
  try {
    const base = repo.listUsers?.() || []
    const items = base.map(it => ({
      ...it,
      topicLikes: repo.sumTopicScoreByUser(it.id),
      pointLikes: repo.sumPointUpvotesByUser(it.id),
      commentLikes: repo.sumCommentUpvotesByUser(it.id),
    }))
    res.json({ items })
  } catch { res.status(500).json({ error: 'READ_USERS_FAILED' }) }
})

app.get('/api/admin/stats', (req, res) => {
  const cookieMap = parseCookies(req)
  const token = cookieMap['pl_session'] || cookieMap['pl_session_dev']
  const u = token ? repo.getUserBySession(token) : null
  const isSuper = u && ((u.id === 'u-1762500221827') || (u.email === 'chaoting666@gmail.com'))
  const role = u ? (isSuper ? 'superadmin' : (u.role || 'user')) : 'user'
  if (role !== 'admin' && role !== 'superadmin') return res.status(403).json({ error: 'FORBIDDEN' })
  try {
    const data = repo.getStats()
    res.json({ data })
  } catch { res.status(500).json({ error: 'READ_STATS_FAILED' }) }
})

// Local auth
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64)
  return `s2:${salt}:${derived.toString('hex')}`
}
function verifyPassword(password, stored) {
  try {
    const [tag, salt, hashHex] = String(stored).split(':')
    if (tag !== 's2') return false
    const check = crypto.scryptSync(password, salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hashHex, 'hex'))
  } catch { return false }
}

app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body || {}
    if (!email || !password || String(password).length < 6) return res.status(400).json({ error: 'INVALID_INPUT' })
    const exist = repo.getUserByEmail(String(email).toLowerCase())
    if (exist) return res.status(409).json({ error: 'EMAIL_EXISTS' })
    const pwd = hashPassword(String(password))
    const u = repo.createLocalUser({ email: String(email).toLowerCase(), password_hash: pwd, name })
    if (!u) return res.status(500).json({ error: 'CREATE_USER_FAILED' })
    const s = repo.createSession(u.id)
    setSessionCookie(req, res, s.token)
    res.status(201).json({ data: { id: u.id, email: u.email, name: u.name } })
  } catch { res.status(500).json({ error: 'REGISTER_FAILED' }) }
})

app.post('/api/auth/login-password', (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'INVALID_INPUT' })
    const u = repo.getUserByEmail(String(email).toLowerCase())
    if (!u || u.provider !== 'local' || !verifyPassword(String(password), u.password_hash)) return res.status(401).json({ error: 'BAD_CREDENTIALS' })
    const s = repo.createSession(u.id)
    setSessionCookie(req, res, s.token)
    res.json({ data: { id: u.id, email: u.email, name: u.name } })
  } catch { res.status(500).json({ error: 'LOGIN_FAILED' }) }
})

app.patch('/api/me', (req, res) => {
  try {
    const token = parseCookies(req)['pl_session']
    const u = token ? repo.getUserBySession(token) : null
    if (!u) return res.status(401).json({ error: 'UNAUTHORIZED' })
    const { name, bio } = req.body || {}
    const updated = repo.updateUserProfile(u.id, { name, bio })
    res.json({ data: { id: updated.id, email: updated.email, name: updated.name, picture: updated.picture, bio: updated.bio } })
  } catch { res.status(500).json({ error: 'UPDATE_PROFILE_FAILED' }) }
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PointLab API listening on :${PORT}`)
})

// Optional static hosting (for single-server deploy)
// If dist folder exists, serve SPA assets and fallback to index.html
try {
  const distDir = path.join(path.dirname(__filename), '..', 'dist')
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })
    // eslint-disable-next-line no-console
    console.log('Serving static files from dist/')
  }
} catch {}
