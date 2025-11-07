// Simple Express API server for PointLab
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { repo } from './db/repo.js'

const app = express()
// CORS: allow specific origins in production
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({ origin: allowed.length ? allowed : true, credentials: false }))
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

// Topics
app.get('/api/topics', (req, res) => {
  try {
    const { page = '1', size = '30', sort = 'new' } = req.query
    const p = Math.max(1, parseInt(page, 10) || 1)
    const s = Math.max(1, Math.min(100, parseInt(size, 10) || 30))
    const { items: raw, total } = repo.listTopics({ page: p, size: s, sort })
    const items = (raw || []).map((t, i) => {
      let createdAt = t.createdAt || t.created_at
      if (!createdAt && typeof t.id === 'string' && t.id.startsWith('t-')) {
        const ts = Number(t.id.slice(2))
        if (!Number.isNaN(ts)) createdAt = new Date(ts).toISOString()
      }
      if (!createdAt) createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      return { ...t, createdAt }
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
    res.json({ data: { ...topic, createdAt } })
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
    res.json({ data: { ...topic, createdAt } })
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
    const rec = {
      id,
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      mode: mode === 'duel' ? 'duel' : 'open',
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
    const { topic: topicParam, sort = 'hot', page = '1', size = '20' } = req.query
    const p = Math.max(1, parseInt(page, 10) || 1)
    const s = Math.max(1, Math.min(100, parseInt(size, 10) || 20))
    const { items: raw, total } = repo.listPoints({ topic: topicParam, sort, page: p, size: s })
    const items = (raw || []).map((it) => ({ ...it, createdAt: it.createdAt || it.created_at }))
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
    const record = {
      id,
      description: String(description).trim(),
      topicId: topicId || undefined,
      author: {
        name: (authorName && String(authorName).trim()) || (authorType === 'user' ? '用戶' : '匿名'),
        role: authorType === 'user' ? 'user' : 'guest',
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
  const item = repo.getPoint(req.params.id)
  if (!item) return res.status(404).json({ error: 'NOT_FOUND' })
  res.json({ data: { ...item, createdAt: item.createdAt || item.created_at } })
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
      author: it.author_name ? { name: it.author_name, role: it.author_type || 'guest' } : (it.author || { name: '匿名', role: 'guest' }),
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
    const row = repo.createComment({ id, pointId: req.params.id, parentId, content: String(content).trim(), authorName, authorType })
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
