// Lightweight repository with SQLite (better-sqlite3) when available,
// and JSON fallback when SQLite is not installed.
import fs from 'node:fs'
import path from 'node:path'

let sqlite = null
try {
  // optional dependency
  // eslint-disable-next-line import/no-extraneous-dependencies
  sqlite = await import('better-sqlite3').then(m => m.default || m).catch(() => null)
} catch {}

const DATA_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data')
const DB_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'pointlab.db')

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

let db = null
export function init() {
  if (!sqlite) return false
  try {
    db = sqlite(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.exec(`
      create table if not exists topics (
        id text primary key,
        name text not null,
        description text,
        slug text,
        mode text default 'open',
        score integer default 0,
        count integer default 0,
        created_at text not null
      );
      create table if not exists points (
        id text primary key,
        topic_id text,
        description text not null,
        author_name text,
        author_type text,
        position text,
        upvotes integer default 0,
        comments integer default 0,
        shares integer default 0,
        created_at text not null,
        foreign key(topic_id) references topics(id) on delete cascade
      );
      create index if not exists idx_topics_created on topics(created_at desc);
      create index if not exists idx_topics_score on topics(score desc, created_at asc);
      create index if not exists idx_points_topic on points(topic_id, created_at desc);
      create index if not exists idx_points_topic_pos on points(topic_id, position, created_at desc);
    `)
    return true
  } catch {
    db = null
    return false
  }
}

function nowIso() { return new Date().toISOString() }

export const repo = {
  listTopics({ page = 1, size = 30, sort = 'new' }) {
    if (db) {
      const order = sort === 'old' ? 'created_at asc' : (sort === 'hot' ? 'score desc, created_at asc' : 'created_at desc')
      const stmt = db.prepare(`select * from topics order by ${order} limit ? offset ?`)
      const total = db.prepare('select count(*) as c from topics').get().c
      const items = stmt.all(size, (page - 1) * size)
      return { items, total }
    }
  const topics = readJson('topics.json')
    let items = topics
    if (sort === 'old') items = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    else if (sort === 'hot') items = [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (new Date(a.createdAt) - new Date(b.createdAt)))
    else items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return { items: items.slice((page - 1) * size, (page - 1) * size + size), total: items.length }
  },
  getTopic(idOrSlug) {
    if (db) {
      const row = db.prepare('select * from topics where id=? or slug=?').get(idOrSlug, idOrSlug)
      return row || null
    }
    const topics = readJson('topics.json')
    return topics.find(t => t.id === idOrSlug || t.slug === idOrSlug) || null
  },
  createTopic({ id, name, description, mode }) {
    if (db) {
      db.prepare('insert into topics (id,name,description,slug,mode,score,count,created_at) values (?,?,?,?,?,?,?,?)')
        .run(id, name, description, description ? null : null, mode, 0, 0, nowIso())
      return this.getTopic(id)
    }
    const topics = readJson('topics.json')
    const rec = { id, name, description, slug: name, mode, score: 0, count: 0, createdAt: nowIso() }
    topics.unshift(rec)
    writeJson('topics.json', topics)
    return rec
  },
  updateTopic(id, fields) {
    if (db) {
      const t = this.getTopic(id)
      if (!t) return null
      const next = { ...t, ...fields }
      db.prepare('update topics set name=?, description=?, mode=? where id=?').run(next.name, next.description ?? null, next.mode, id)
      return this.getTopic(id)
    }
    const topics = readJson('topics.json')
    const idx = topics.findIndex(t => t.id === id)
    if (idx === -1) return null
    topics[idx] = { ...topics[idx], ...fields }
    writeJson('topics.json', topics)
    return topics[idx]
  },
  voteTopic(id, delta) {
    if (db) {
      const t = this.getTopic(id)
      if (!t) return null
      const next = (t.score ?? 0) + (delta === -1 ? -1 : 1)
      db.prepare('update topics set score=? where id=?').run(next, id)
      return this.getTopic(id)
    }
    const topics = readJson('topics.json')
    const idx = topics.findIndex(t => t.id === id)
    if (idx === -1) return null
    topics[idx].score = (topics[idx].score ?? 0) + (delta === -1 ? -1 : 1)
    writeJson('topics.json', topics)
    return topics[idx]
  },
  deleteTopic(id) {
    if (db) {
      const tx = db.transaction((tid) => {
        db.prepare('delete from points where topic_id=?').run(tid)
        db.prepare('delete from topics where id=?').run(tid)
      })
      tx(id)
      return true
    }
    const topics = readJson('topics.json')
    const idx = topics.findIndex(t => t.id === id)
    if (idx === -1) return false
    topics.splice(idx, 1)
    writeJson('topics.json', topics)
    return true
  },
  listPoints({ topic, sort = 'hot', page = 1, size = 20 }) {
    if (db) {
      let where = ''
      const params = []
      if (topic) { where = 'where topic_id = ?'; params.push(topic) }
      let order = 'upvotes desc'
      if (sort === 'new') order = 'created_at desc'
      else if (sort === 'old') order = 'created_at asc'
      else if (sort === 'top') order = 'rowid asc'
      const total = db.prepare(`select count(*) as c from points ${where}`).get(...params).c
      const items = db.prepare(`select * from points ${where} order by ${order} limit ? offset ?`).all(...params, size, (page - 1) * size)
      return { items, total }
    }
    let items = readJson('points.json')
    if (topic) items = items.filter(h => h.topicId === topic)
    if (sort === 'new') items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (sort === 'old') items = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    else items = [...items].sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0))
    return { items: items.slice((page - 1) * size, (page - 1) * size + size), total: items.length }
  },
  getPoint(id) {
    if (db) return db.prepare('select * from points where id=?').get(id) || null
    const hacks = readJson('points.json')
    return hacks.find(h => h.id === id) || null
  },
  createPoint(rec) {
    if (db) {
      const tx = db.transaction((r) => {
        db.prepare('insert into points (id,topic_id,description,author_name,author_type,position,upvotes,comments,shares,created_at) values (?,?,?,?,?,?,?,?,?,?)')
          .run(r.id, r.topicId || null, r.description, r.author?.name || null, r.author?.role || 'guest', r.position || null, 0, 0, 0, nowIso())
        if (r.topicId) db.prepare('update topics set count = coalesce(count,0)+1 where id=?').run(r.topicId)
      })
      tx(rec)
      return this.getPoint(rec.id)
    }
    const points = readJson('points.json')
    points.unshift(rec)
    writeJson('points.json', points)
    if (rec.topicId) this.incrementTopicCount(rec.topicId, +1)
    return rec
  },
  updatePoint(id, fields) {
    if (db) {
      const p = this.getPoint(id)
      if (!p) return null
      const next = { ...p, ...fields }
      db.prepare('update points set description=?, position=? where id=?')
        .run(next.description, next.position || null, id)
      return this.getPoint(id)
    }
    const hacks = readJson('points.json')
    const idx = hacks.findIndex(h => h.id === id)
    if (idx === -1) return null
    hacks[idx] = { ...hacks[idx], ...fields }
    writeJson('points.json', hacks)
    return hacks[idx]
  },
  deletePoint(id) {
    if (db) {
      const p = this.getPoint(id)
      if (!p) return false
      const tx = db.transaction((pid, tId) => {
        db.prepare('delete from points where id=?').run(pid)
        if (tId) db.prepare('update topics set count = max(coalesce(count,0)-1,0) where id=?').run(tId)
      })
      tx(id, p.topic_id)
      return true
    }
    const hacks = readJson('points.json')
    const idx = hacks.findIndex(h => h.id === id)
    if (idx === -1) return false
    const topicId = hacks[idx].topicId
    hacks.splice(idx, 1)
    writeJson('points.json', hacks)
    if (topicId) this.incrementTopicCount(topicId, -1)
    return true
  },
  incrementTopicCount(topicId, delta) {
    if (db) {
      db.prepare('update topics set count = max(coalesce(count,0)+?,0) where id=?').run(delta, topicId)
      return
    }
    const topics = readJson('topics.json')
    const idx = topics.findIndex(t => t.id === topicId)
    if (idx !== -1) {
      topics[idx].count = Math.max(0, (topics[idx].count || 0) + delta)
      writeJson('topics.json', topics)
    }
  },
}

// initialize if possible
init()
