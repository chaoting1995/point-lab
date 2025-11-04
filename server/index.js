// Simple Express API server for PointLab
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
app.use(cors())
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
    const topics = readJson('topics.json')
    const withDefaults = topics.map((t, i) => {
      let createdAt = t.createdAt
      if (!createdAt && typeof t.id === 'string' && t.id.startsWith('t-')) {
        const ts = Number(t.id.slice(2))
        if (!Number.isNaN(ts)) createdAt = new Date(ts).toISOString()
      }
      // 若仍無 createdAt，依原始索引推一個穩定時間（較前者較新）
      if (!createdAt) {
        createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      }
      return {
        ...t,
        score: typeof t.score === 'number' ? t.score : 0,
        createdAt: createdAt || new Date().toISOString(),
      }
    })
    // 排序：new(預設)=時間新到舊、old=舊到新、hot=score 多到少
    let items = withDefaults
    if (sort === 'old') {
      // 最舊：由舊到新
      items = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else if (sort === 'hot') {
      // 熱門：依 score 高到低；同分時由舊到新
      items = [...items].sort((a, b) => {
        const sa = a.score ?? 0
        const sb = b.score ?? 0
        if (sb !== sa) return sb - sa
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
    } else {
      // 最新：由新到舊
      items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    // 將缺漏欄位回寫，避免下次再缺
    try { writeJson('topics.json', withDefaults) } catch {}
    const p = Math.max(1, parseInt(page, 10) || 1)
    const s = Math.max(1, Math.min(100, parseInt(size, 10) || 30))
    const start = (p - 1) * s
    const paged = items.slice(start, start + s)
    res.json({ items: paged, page: p, size: s, total: items.length })
  } catch (e) {
    res.status(500).json({ error: 'READ_TOPICS_FAILED' })
  }
})

// by id (preferred)
app.get('/api/topics/id/:id', (req, res) => {
  try {
    const topics = readJson('topics.json')
    const topic = topics.find((t) => t.id === req.params.id)
    if (!topic) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ data: topic })
  } catch (e) {
    res.status(500).json({ error: 'READ_TOPIC_FAILED' })
  }
})

// backward compat by slug
app.get('/api/topics/:slug', (req, res) => {
  try {
    const topics = readJson('topics.json')
    const topic = topics.find((t) => t.slug === req.params.slug)
    if (!topic) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ data: topic })
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
    const topics = readJson('topics.json')
    let slug = slugify(name)
    // ensure uniqueness
    if (topics.some((t) => t.slug === slug)) {
      let i = 2
      while (topics.some((t) => t.slug === `${slug}-${i}`)) i += 1
      slug = `${slug}-${i}`
    }
    const id = `t-${Date.now()}`
    const record = {
      id,
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      slug,
      count: 0,
      score: 0,
      createdAt: new Date().toISOString(),
      mode: mode === 'duel' ? 'duel' : 'open',
    }
    const next = [record, ...topics]
    writeJson('topics.json', next)
    res.status(201).json({ data: record })
  } catch (e) {
    res.status(500).json({ error: 'CREATE_TOPIC_FAILED' })
  }
})

// Topic vote (up/down). Body: { delta: 1 | -1 }
function applyVote(req, res) {
  try {
    const { delta } = req.body || {}
    const topics = readJson('topics.json')
    const idx = topics.findIndex((t) => t.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'NOT_FOUND' })
    const current = topics[idx]
    const nextScore = (typeof current.score === 'number' ? current.score : 0) + (delta === -1 ? -1 : 1)
    const updated = { ...current, score: nextScore }
    topics[idx] = updated
    writeJson('topics.json', topics)
    res.json({ data: updated })
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
    const hacks = readJson('hacks.json')
    let items = hacks.map((h) => {
      // 向後相容：若舊紀錄使用 stance，映射到 position
      const pos = h.position || (h.stance === 'pro' ? 'agree' : h.stance === 'other' ? 'others' : undefined)
      return pos ? { ...h, position: pos } : h
    })

    if (topicParam) {
      const topics = readJson('topics.json')
      const topic = topics.find((t) => t.id === topicParam || t.slug === topicParam)
      if (topic) {
        const byTag = topic.tag
          ? items.filter((h) => (h.hashtags || []).some((tag) => String(tag).includes(topic.tag)))
          : []
        const byId = items.filter((h) => h.topicId && h.topicId === topic.id)
        const map = new Map()
        ;[...byTag, ...byId].forEach((x) => map.set(x.id, x))
        items = Array.from(map.values()).map((it) => {
          // 對立模式：若缺 position，預設為 others，避免前端左右欄出現空值
          if (topic.mode === 'duel' && !it.position) return { ...it, position: 'others' }
          return it
        })
      } else {
        items = []
      }
    }

    if (sort === 'new') {
      items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sort === 'old') {
      items = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else if (sort === 'top') {
      items = [...items].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    } else {
      // hot (by upvotes)
      items = [...items].sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0))
    }

    const p = Math.max(1, parseInt(page, 10) || 1)
    const s = Math.max(1, Math.min(100, parseInt(size, 10) || 20))
    const start = (p - 1) * s
    const paged = items.slice(start, start + s)
    res.json({ items: paged, page: p, size: s, total: items.length })
  } catch (e) {
    res.status(500).json({ error: 'READ_HACKS_FAILED' })
  }
}
app.get('/api/hacks', listPoints)
app.get('/api/points', listPoints)

function createPoint(req, res) {
  try {
    const { description, topicId, authorName, authorType, position } = req.body || {}
    if (!description || String(description).trim().length < 1) {
      return res.status(400).json({ error: 'DESCRIPTION_REQUIRED' })
    }
    const hacks = readJson('hacks.json')
    const id = `point-${Date.now()}`
    const record = {
      id,
      rank: 999,
      upvotes: 0,
      comments: 0,
      shares: 0,
      createdAt: new Date().toISOString(),
      author: {
        name: (authorName && String(authorName).trim()) || (authorType === 'user' ? '用戶' : '匿名'),
        role: authorType === 'user' ? 'user' : 'guest',
      },
      hashtags: [],
      description: String(description).trim(),
      topicId: topicId || undefined,
      // 對立模式的立場（'agree' | 'others'）；開放模式可忽略
      position: position === 'agree' || position === 'others' ? position : undefined,
    }
    hacks.unshift(record)
    writeJson('hacks.json', hacks)

    // 如果有對應的 topicId，順手將該主題的觀點數量加一
    try {
      if (topicId) {
        const topics = readJson('topics.json')
        const idx = topics.findIndex((t) => t.id === topicId)
        if (idx !== -1) {
          const current = topics[idx]
          const nextCount = (typeof current.count === 'number' ? current.count : 0) + 1
          topics[idx] = { ...current, count: nextCount }
          writeJson('topics.json', topics)
        }
      }
    } catch {}
    res.status(201).json({ data: record })
  } catch (e) {
    res.status(500).json({ error: 'CREATE_POINT_FAILED' })
  }
}
app.post('/api/hacks', createPoint)
app.post('/api/points', createPoint)

app.get('/api/hacks/:id', (req, res) => {
  const hacks = readJson('hacks.json')
  const item = hacks.find((h) => h.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'NOT_FOUND' })
  res.json({ data: item })
})
app.get('/api/points/:id', (req, res) => {
  const hacks = readJson('hacks.json')
  const item = hacks.find((h) => h.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'NOT_FOUND' })
  res.json({ data: item })
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PointLab API listening on :${PORT}`)
})
