// Lightweight repository with SQLite (better-sqlite3) when available,
// and JSON fallback when SQLite is not installed.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

let sqlite = null
try {
  // optional dependency
  // eslint-disable-next-line import/no-extraneous-dependencies
  sqlite = await import('better-sqlite3').then(m => m.default || m).catch(() => null)
} catch {}

const ROOT_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const explicitDbPath = process.env.POINTLAB_DB_PATH && process.env.POINTLAB_DB_PATH.trim()
const flyVolumePath = process.env.FLY_APP_NAME ? '/app/data/pointlab.db' : null
const defaultDbPath = path.join(ROOT_DIR, 'pointlab.db')
// Fly 部署若未設 POINTLAB_DB_PATH，預設嘗試讀取掛載在 /app/data 的 volume DB，若新 volume 無檔案則從原 DB 複製
const DB_PATH = (() => {
  if (explicitDbPath) return explicitDbPath
  if (flyVolumePath) {
    try { fs.mkdirSync(path.dirname(flyVolumePath), { recursive: true }) } catch {}
    const volumeExists = (() => { try { return fs.existsSync(flyVolumePath) } catch { return false } })()
    if (volumeExists) return flyVolumePath
    const defaultExists = (() => { try { return fs.existsSync(defaultDbPath) } catch { return false } })()
    if (defaultExists) {
      try {
        fs.copyFileSync(defaultDbPath, flyVolumePath)
        return flyVolumePath
      } catch {
        return defaultDbPath
      }
    }
    return flyVolumePath
  }
  return defaultDbPath
})()
const disableJsonFallback = String(process.env.DISABLE_JSON_FALLBACK || '').toLowerCase() === '1'
const USER_ACTIVITY_LIMIT = 200

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
  if (!sqlite) {
    try {
      const req = createRequire(import.meta.url)
      // eslint-disable-next-line import/no-extraneous-dependencies
      const mod = req('better-sqlite3')
      sqlite = mod?.default || mod || null
    } catch {}
  }
  if (!sqlite) {
    if (disableJsonFallback) {
      throw new Error('[repo] better-sqlite3 未載入且已設 DISABLE_JSON_FALLBACK=1，無法啟動')
    }
    try { console.warn('[repo] storage=json (better-sqlite3 not loaded)') } catch {}
    return false
  }
  try {
    db = sqlite(DB_PATH)
    db.pragma('journal_mode = WAL')
    try { console.log(`[repo] storage=sqlite path=${DB_PATH}`) } catch {}
  db.exec(`
      create table if not exists topics (
        id text primary key,
        name text not null,
        description text,
        mode text default 'open',
        created_by text,
        created_by_guest text,
        score integer default 0,
        count integer default 0,
        created_at text not null
      );
      create table if not exists points (
        id text primary key,
        topic_id text,
        user_id text,
        guest_id text,
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
      create table if not exists comments (
        id text primary key,
        point_id text not null,
        parent_id text,
        user_id text,
        guest_id text,
        author_name text,
        author_type text,
        content text not null,
        upvotes integer default 0,
        created_at text not null,
        foreign key(point_id) references points(id) on delete cascade
      );
      create index if not exists idx_comments_point on comments(point_id, created_at asc);
      create index if not exists idx_comments_parent on comments(parent_id, created_at asc);
      create table if not exists users (
        id text primary key,
        provider text not null,
        provider_user_id text,
        email text,
        email_verified integer default 0,
        name text,
        picture text,
        bio text,
        topics_json text,
        points_json text,
        comments_json text,
        password_hash text,
        created_at text not null,
        last_login text
      );
      create unique index if not exists idx_users_provider on users(provider, provider_user_id);
      create unique index if not exists idx_users_email on users(email);
      create table if not exists sessions (
        id text primary key,
        user_id text not null,
        token text not null unique,
        created_at text not null,
        expires_at text not null,
        last_seen text,
        foreign key(user_id) references users(id) on delete cascade
      );
      create table if not exists reports (
        id text primary key,
        type text not null,
        target_id text not null,
        user_id text,
        reason text,
        status text default 'open',
        created_at text not null
      );
      create table if not exists guests (
        id text primary key,
        name text,
        posts_topic integer default 0,
        posts_point integer default 0,
        posts_comment integer default 0,
        created_at text not null,
        last_seen text not null
      );
    `)
    try { db.prepare("alter table reports add column status text default 'open'").run() } catch {}
    return true
  } catch (err) {
    db = null
    if (disableJsonFallback) {
      throw new Error(`[repo] 初始化 SQLite 失敗且已停用 JSON fallback：${err?.message || err}`)
    }
    try { console.warn('[repo] storage=json (sqlite init failed)', err) } catch {}
    return false
  }
}

function nowIso() { return new Date().toISOString() }

export const repo = {
  diag() {
    const out = { sqlite: !!db, dbPath: DB_PATH, topicsDb: null, pointsDb: null, topicsJson: 0, pointsJson: 0 }
    try { out.topicsJson = readJson('topics.json').length } catch {}
    try { out.pointsJson = readJson('points.json').length } catch {}
    if (db) {
      try { out.topicsDb = db.prepare('select count(*) as c from topics').get().c } catch { out.topicsDb = null }
      try { out.pointsDb = db.prepare('select count(*) as c from points').get().c } catch { out.pointsDb = null }
    }
    return out
  },
  upsertGuest(id, name) {
    const now = nowIso()
    if (db) {
      try { db.prepare("alter table guests add column name text").run() } catch {}
      try { db.prepare("alter table guests add column posts_topic integer default 0").run() } catch {}
      try { db.prepare("alter table guests add column posts_point integer default 0").run() } catch {}
      try { db.prepare("alter table guests add column posts_comment integer default 0").run() } catch {}
      try { db.prepare("alter table guests add column last_seen text").run() } catch {}
      const exist = db.prepare('select id from guests where id=?').get(id)
      if (exist) db.prepare('update guests set name=coalesce(?,name), last_seen=? where id=?').run(name || null, now, id)
      else db.prepare('insert into guests (id,name,posts_topic,posts_point,posts_comment,created_at,last_seen) values (?,?,?,?,?,?,?)').run(id, name || null, 0, 0, 0, now, now)
      // Mirror to users as a guest user（email 空、role=guest）
      try { db.prepare("alter table users add column role text default 'user'").run() } catch {}
      const u = db.prepare('select id from users where id=?').get(id)
      if (!u) {
        db.prepare('insert into users (id,provider,provider_user_id,email,email_verified,name,picture,bio,topics_json,points_json,comments_json,password_hash,created_at,last_login,role) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(id, 'guest', id, null, 0, name || null, null, null, '[]','[]','[]', null, now, now, 'guest')
      } else {
        db.prepare('update users set name=coalesce(?,name), role=coalesce(role,?) where id=?').run(name || null, 'guest', id)
      }
      return
    }
    // JSON fallback
    const guests = readJson('guests.json')
    const gi = guests.findIndex(g=>g.id===id)
    if (gi===-1) guests.push({ id, name: name || null, posts_topic: 0, posts_point: 0, posts_comment: 0, created_at: now, last_seen: now })
    else { guests[gi].name = name || guests[gi].name; guests[gi].last_seen = now }
    writeJson('guests.json', guests)
    const users = readJson('users.json')
    if (!users.some(u=>u.id===id)) users.push({ id, provider: 'guest', provider_user_id: id, email: null, email_verified: false, name: name || null, picture: null, bio: null, topics: [], points: [], comments: [], password_hash: null, created_at: now, last_login: now, role: 'guest' })
    writeJson('users.json', users)
  },
  incGuestCounter(id, kind) {
    const now = nowIso()
    if (db) {
      try { db.prepare("alter table guests add column posts_topic integer default 0").run() } catch {}
      try { db.prepare("alter table guests add column posts_point integer default 0").run() } catch {}
      try { db.prepare("alter table guests add column posts_comment integer default 0").run() } catch {}
      try { db.prepare('update guests set last_seen=? where id=?').run(now, id) } catch {}
      const col = kind==='topic' ? 'posts_topic' : (kind==='point' ? 'posts_point' : 'posts_comment')
      try { db.prepare(`update guests set ${col} = coalesce(${col},0)+1 where id=?`).run(id) } catch {}
      return
    }
    const guests = readJson('guests.json')
    const gi = guests.findIndex(g=>g.id===id)
    if (gi!==-1) {
      const g = guests[gi]
      if (kind==='topic') g.posts_topic = (g.posts_topic||0)+1
      else if (kind==='point') g.posts_point = (g.posts_point||0)+1
      else g.posts_comment = (g.posts_comment||0)+1
      g.last_seen = now
      writeJson('guests.json', guests)
    }
  },
  ensureUserActivityColumns() {
    if (!db) return
    try { db.prepare('alter table users add column topics_json text').run() } catch {}
    try { db.prepare('alter table users add column points_json text').run() } catch {}
    try { db.prepare('alter table users add column comments_json text').run() } catch {}
  },
  // Roles
  setUserRole(id, role) {
    if (db) { try { db.prepare('update users set role=? where id=?').run(role, id); return true } catch { return false } }
    const users = readJson('users.json')
    const idx = users.findIndex(u=>u.id===id)
    if (idx===-1) return false
    users[idx].role = role
    writeJson('users.json', users)
    return true
  },
  // Reports
  addReport({ id, type, targetId, userId, reason, status = 'open' }) {
    const now = nowIso()
    const normalizedStatus = status === 'resolved' ? 'resolved' : 'open'
    if (db) {
      try { db.prepare("alter table reports add column status text default 'open'").run() } catch {}
      db.prepare('insert into reports (id,type,target_id,user_id,reason,status,created_at) values (?,?,?,?,?,?,?)')
        .run(id, type, targetId, userId || null, reason || null, normalizedStatus, now)
      return { id, type, targetId, userId, reason, status: normalizedStatus, createdAt: now }
    }
    const all = readJson('reports.json')
    const rec = { id, type, targetId, userId, reason, status: normalizedStatus, createdAt: now }
    all.push(rec); writeJson('reports.json', all); return rec
  },
  listReports(type) {
    if (db) {
      const rows = type ? db.prepare('select * from reports where type=? order by created_at desc').all(type)
                        : db.prepare('select * from reports order by created_at desc').all()
      return rows.map(r => ({ id: r.id, type: r.type, targetId: r.target_id, userId: r.user_id, reason: r.reason, status: r.status || 'open', createdAt: r.created_at }))
    }
    const all = readJson('reports.json')
    const list = type ? all.filter(r=>r.type===type) : all
    return list.map(r => ({ ...r, status: r.status || 'open' }))
  },
  getReportById(id) {
    if (db) {
      try {
        const r = db.prepare('select * from reports where id=?').get(id)
        if (!r) return null
        return { id: r.id, type: r.type, targetId: r.target_id, userId: r.user_id, reason: r.reason, status: r.status || 'open', createdAt: r.created_at }
      } catch { return null }
    }
    const all = readJson('reports.json')
    const found = all.find(r => r.id === id)
    return found ? { ...found, status: found.status || 'open' } : null
  },
  updateReportStatus(id, status) {
    const normalizedStatus = status === 'resolved' ? 'resolved' : 'open'
    if (db) {
      try {
        const res = db.prepare('update reports set status=? where id=?').run(normalizedStatus, id)
        if (res.changes === 0) return null
        return this.getReportById(id)
      } catch { return null }
    }
    const all = readJson('reports.json')
    const idx = all.findIndex(r => r.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], status: normalizedStatus }
    writeJson('reports.json', all)
    return all[idx]
  },
  listTopics({ page = 1, size = 30, sort = 'new' }) {
    if (db) {
      const order = sort === 'old' ? 'created_at asc' : (sort === 'hot' ? 'score desc, created_at asc' : 'created_at desc')
      const total = db.prepare('select count(*) as c from topics').get().c
      const items = db.prepare(`select * from topics order by ${order} limit ? offset ?`).all(size, (page - 1) * size)
      return { items, total }
    }
  const topics = readJson('topics.json')
    let items = topics
    if (sort === 'old') items = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    else if (sort === 'hot') items = [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (new Date(a.createdAt) - new Date(b.createdAt)))
    else items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return { items: items.slice((page - 1) * size, (page - 1) * size + size), total: items.length }
  },
  getTopic(id) {
    if (db) {
      const row = db.prepare('select * from topics where id=?').get(id)
      return row || null
    }
    const topics = readJson('topics.json')
    return topics.find(t => t.id === id) || null
  },
  createTopic({ id, name, description, mode, createdBy, createdByGuest, author }) {
    if (db) {
      try { db.prepare('alter table topics add column created_by text').run() } catch {}
      try { db.prepare('alter table topics add column created_by_guest text').run() } catch {}
      db.prepare('insert into topics (id,name,description,slug,mode,score,count,created_at) values (?,?,?,?,?,?,?,?)')
        .run(id, name, description, null, mode, 0, 0, nowIso())
      if (createdBy) { try { db.prepare('update topics set created_by=? where id=?').run(createdBy, id) } catch {} }
      if (createdByGuest) { try { db.prepare('update topics set created_by_guest=? where id=?').run(createdByGuest, id) } catch {} }
      if (createdByGuest) this.incGuestCounter(createdByGuest, 'topic')
      return this.getTopic(id)
    }
    const topics = readJson('topics.json')
    const rec = { id, name, description, slug: null, mode, score: 0, count: 0, createdAt: nowIso(), createdBy: createdBy || null, createdByGuest: createdByGuest || null, author }
    topics.unshift(rec)
    writeJson('topics.json', topics)
    if (createdBy) this.appendUserItem(createdBy, 'topics', id)
    if (createdByGuest) this.incGuestCounter(createdByGuest, 'topic')
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
      const d = Number.isFinite(delta) ? Math.max(-2, Math.min(2, Math.trunc(delta))) : (delta === -1 ? -1 : 1)
      const next = (t.score ?? 0) + d
      db.prepare('update topics set score=? where id=?').run(next, id)
      return this.getTopic(id)
    }
    const topics = readJson('topics.json')
    const idx = topics.findIndex(t => t.id === id)
    if (idx === -1) return null
    const d = Number.isFinite(delta) ? Math.max(-2, Math.min(2, Math.trunc(delta))) : (delta === -1 ? -1 : 1)
    topics[idx].score = (topics[idx].score ?? 0) + d
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
    const points = readJson('points.json')
    if (points.length) {
      const toRemove = points.filter(p => p.topicId === id || p.topic_id === id)
      if (toRemove.length) {
        const remainingPoints = points.filter(p => !(p.topicId === id || p.topic_id === id))
        writeJson('points.json', remainingPoints)
        const removedPointIds = new Set(toRemove.map(p => p.id))
        const comments = readJson('comments.json')
        if (comments.length) {
          const nextComments = comments.filter(c => !removedPointIds.has(c.pointId) && !removedPointIds.has(c.point_id))
          if (nextComments.length !== comments.length) writeJson('comments.json', nextComments)
        }
      }
    }
    return true
  },
  listPoints({ topic, user, sort = 'hot', page = 1, size = 20 }) {
    if (db) {
      let where = ''
      const params = []
      if (topic) { where = 'where topic_id = ?'; params.push(topic) }
      if (user) { where = where ? (where + ' and user_id = ?') : 'where user_id = ?'; params.push(user) }
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
    if (user) items = items.filter(h => h.userId === user)
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
        try { db.prepare('alter table points add column user_id text').run() } catch {}
        try { db.prepare('alter table points add column guest_id text').run() } catch {}
        db.prepare('insert into points (id,topic_id,user_id,guest_id,description,author_name,author_type,position,upvotes,comments,shares,created_at) values (?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(r.id, r.topicId || null, r.userId || null, r.guestId || null, r.description, r.author?.name || null, r.author?.role || 'guest', r.position || null, 0, 0, 0, nowIso())
        if (r.topicId) db.prepare('update topics set count = coalesce(count,0)+1 where id=?').run(r.topicId)
      })
      tx(rec)
      if (rec.guestId) this.incGuestCounter(rec.guestId, 'point')
      return this.getPoint(rec.id)
    }
    const points = readJson('points.json')
    const now = nowIso()
    points.unshift({ ...rec, userId: rec.userId || null, guestId: rec.guestId || null, createdAt: now })
    writeJson('points.json', points)
    if (rec.topicId) this.incrementTopicCount(rec.topicId, +1)
    if (rec.userId) this.appendUserItem(rec.userId, 'points', rec.id)
    if (rec.guestId) this.incGuestCounter(rec.guestId, 'point')
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
  votePoint(id, delta) {
    if (db) {
      const p = this.getPoint(id)
      if (!p) return null
      const d = Number.isFinite(delta) ? Math.max(-2, Math.min(2, Math.trunc(delta))) : (delta === -1 ? -1 : 1)
      const next = (p.upvotes ?? 0) + d
      db.prepare('update points set upvotes=? where id=?').run(next, id)
      return this.getPoint(id)
    }
    const points = readJson('points.json')
    const idx = points.findIndex(h => h.id === id)
    if (idx === -1) return null
    const d = Number.isFinite(delta) ? Math.max(-2, Math.min(2, Math.trunc(delta))) : (delta === -1 ? -1 : 1)
    points[idx].upvotes = (points[idx].upvotes || 0) + d
    writeJson('points.json', points)
    return points[idx]
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
  deleteUser(id) {
    if (db) {
      const tx = db.transaction((uid) => {
        db.prepare('update topics set created_by=null where created_by=?').run(uid)
        db.prepare('update points set user_id=null, author_name=coalesce(author_name, "匿名"), author_type=coalesce(author_type, "guest") where user_id=?').run(uid)
        db.prepare('update comments set user_id=null, author_name=coalesce(author_name, "匿名"), author_type=coalesce(author_type, "guest") where user_id=?').run(uid)
        db.prepare('delete from sessions where user_id=?').run(uid)
        db.prepare('delete from users where id=?').run(uid)
      })
      tx(id)
      return true
    }
    const users = readJson('users.json')
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return false
    users.splice(idx, 1)
    writeJson('users.json', users)
    const topics = readJson('topics.json')
    topics.forEach(t => { if (t.createdBy === id || t.created_by === id) { t.createdBy = null; t.created_by = null } })
    writeJson('topics.json', topics)
    const points = readJson('points.json')
    points.forEach(p => {
      if (p.userId === id || p.user_id === id) {
        p.userId = null
        p.user_id = null
        p.author = p.author || { name: '匿名', role: 'guest' }
        p.author.role = 'guest'
      }
    })
    writeJson('points.json', points)
    const comments = readJson('comments.json')
    comments.forEach(c => {
      if (c.userId === id || c.user_id === id) {
        c.userId = null
        c.user_id = null
        c.author = c.author || { name: '匿名', role: 'guest' }
        c.author.role = 'guest'
      }
    })
    writeJson('comments.json', comments)
    return true
  },
  incrementTopicCount(topicId, delta) {
    if (db) {
      db.prepare('update topics set count = coalesce(count,0)+? where id=?').run(delta, topicId)
      return
    }
    const topics = readJson('topics.json')
    const idx = topics.findIndex(t => t.id === topicId)
    if (idx !== -1) {
      topics[idx].count = (topics[idx].count || 0) + delta
      writeJson('topics.json', topics)
    }
  },
  // Comments
  listComments({ pointId, parentId = null, sort = 'old', page = 1, size = 10 }) {
    if (db) {
      const where = parentId ? 'where point_id=? and parent_id=?' : 'where point_id=? and parent_id is null'
      let order = 'created_at asc'
      if (sort === 'new') order = 'created_at desc'
      else if (sort === 'hot') order = 'upvotes desc, created_at asc'
      const params = parentId ? [pointId, parentId] : [pointId]
      const total = db.prepare(`select count(*) as c from comments ${where}`).get(...params).c
      const items = db.prepare(`select * from comments ${where} order by ${order} limit ? offset ?`).all(...params, size, (page - 1) * size)
      // enrich with child counts for top-level
      if (!parentId) {
        const cntStmt = db.prepare('select count(*) as c from comments where parent_id=?')
        for (const it of items) {
          it.child_count = cntStmt.get(it.id).c
        }
      }
      return { items, total }
    }
    const all = readJson('comments.json')
    let items = all.filter(c => c.pointId === pointId && (parentId ? c.parentId === parentId : !c.parentId))
    if (sort === 'new') items = [...items].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))
    else if (sort === 'hot') items = [...items].sort((a,b)=> (b.upvotes??0)-(a.upvotes??0) || (new Date(a.createdAt)-new Date(b.createdAt)))
    else items = [...items].sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt))
    const pageItems = items.slice((page-1)*size, (page-1)*size+size)
    if (!parentId) {
      const byParent = all.reduce((m, c) => { if (c.parentId) m[c.parentId]=(m[c.parentId]||0)+1; return m }, {})
      for (const it of pageItems) it.child_count = byParent[it.id] || 0
    }
    return { items: pageItems, total: items.length }
  },
  getComment(id) {
    if (db) return db.prepare('select * from comments where id=?').get(id) || null
    const all = readJson('comments.json')
    return all.find(c=>c.id===id) || null
  },
  createComment({ id, pointId, parentId, content, authorName, authorType, userId, guestId }) {
    if (db) {
      try { db.prepare('alter table comments add column user_id text').run() } catch {}
      try { db.prepare('alter table comments add column guest_id text').run() } catch {}
      db.prepare('insert into comments (id,point_id,parent_id,user_id,guest_id,author_name,author_type,content,upvotes,created_at) values (?,?,?,?,?,?,?,0,?)')
        .run(id, pointId, parentId || null, userId || null, guestId || null, authorName || null, authorType || 'guest', content, nowIso())
      // bump point comments count
      db.prepare('update points set comments = coalesce(comments,0)+1 where id=?').run(pointId)
      if (guestId) this.incGuestCounter(guestId, 'comment')
      return db.prepare('select * from comments where id=?').get(id)
    }
    const all = readJson('comments.json')
    const rec = { id, pointId, parentId, userId: userId || null, guestId: guestId || null, content, upvotes: 0, author: { name: authorName || '匿名', role: authorType || 'guest' }, createdAt: nowIso() }
    all.push(rec)
    writeJson('comments.json', all)
    if (userId) this.appendUserItem(userId, 'comments', id)
    if (guestId) this.incGuestCounter(guestId, 'comment')
    return rec
  },
  appendUserItem(userId, kind, itemId) {
    if (db) return
    const users = readJson('users.json')
    const idx = users.findIndex(u=>u.id===userId)
    if (idx===-1) return
    const u = users[idx]
    const key = kind
    const arr = Array.isArray(u[key]) ? u[key] : []
    if (!arr.includes(itemId)) arr.push(itemId)
    u[key] = arr
    users[idx] = u
    writeJson('users.json', users)
  },
  voteComment(id, delta) {
    if (db) {
      const row = db.prepare('select * from comments where id=?').get(id)
      if (!row) return null
      const d = Number.isFinite(delta) ? Math.max(-2, Math.min(2, Math.trunc(delta))) : (delta === -1 ? -1 : 1)
      const next = (row.upvotes ?? 0) + d
      db.prepare('update comments set upvotes=? where id=?').run(next, id)
      return db.prepare('select * from comments where id=?').get(id)
    }
    const all = readJson('comments.json')
    const idx = all.findIndex(c => c.id === id)
    if (idx === -1) return null
    const d = Number.isFinite(delta) ? Math.max(-2, Math.min(2, Math.trunc(delta))) : (delta === -1 ? -1 : 1)
    all[idx].upvotes = (all[idx].upvotes || 0) + d
    writeJson('comments.json', all)
    return all[idx]
  },
  // Auth
  getUserBySession(token) {
    if (db) {
      const s = db.prepare('select * from sessions where token=?').get(token)
      if (!s) return null
      try { if (new Date(s.expires_at) <= new Date()) return null } catch {}
      const u = db.prepare('select * from users where id=?').get(s.user_id)
      return u || null
    }
    const sessions = readJson('sessions.json')
    const s = sessions.find((x)=> x.token===token && new Date(x.expiresAt) > new Date())
    if (!s) return null
    const users = readJson('users.json')
    return users.find((u)=> u.id===s.userId) || null
  },
  upsertGoogleUser({ sub, email, email_verified, name, picture }) {
    const now = nowIso()
    if (db) {
      // try add bio column if older db
      try { db.prepare('alter table users add column bio text').run() } catch {}
      const row = db.prepare('select * from users where provider=? and provider_user_id=?').get('google', sub)
      if (row) {
        if (!row.name && name) {
          db.prepare('update users set email=?, email_verified=?, name=?, picture=?, last_login=? where id=?')
            .run(email || row.email, email_verified ? 1 : 0, name, picture || row.picture, now, row.id)
        } else {
          db.prepare('update users set email=?, email_verified=?, picture=?, last_login=? where id=?')
            .run(email || row.email, email_verified ? 1 : 0, picture || row.picture, now, row.id)
        }
        return db.prepare('select * from users where id=?').get(row.id)
      }
      const id = `u-${Date.now()}`
      db.prepare('insert into users (id,provider,provider_user_id,email,email_verified,name,picture,bio,created_at,last_login) values (?,?,?,?,?,?,?,?,?,?)')
        .run(id,'google',sub,email||null,email_verified?1:0,name||null,picture||null,null,now,now)
      return db.prepare('select * from users where id=?').get(id)
    }
    const users = readJson('users.json')
    const idx = users.findIndex((x)=> x.provider==='google' && x.provider_user_id===sub)
    if (idx !== -1) {
      const existing = users[idx]
      const nextName = existing.name || name || null
      const updated = { ...existing, email: email || existing.email, email_verified: !!email_verified, name: nextName, picture: picture || existing.picture, last_login: now }
      users[idx] = updated
      writeJson('users.json', users)
      return updated
    }
    const created = { id: `u-${Date.now()}`, provider: 'google', provider_user_id: sub, email, email_verified: !!email_verified, name, picture, bio: null, created_at: now, last_login: now }
    users.push(created)
    writeJson('users.json', users)
    return created
  },
  getUserByEmail(email) {
    if (db) return db.prepare('select * from users where email=?').get(email) || null
    const users = readJson('users.json')
    return users.find((u)=> u.email===email) || null
  },
  getUserById(id) {
    if (db) {
      try {
        const row = db.prepare('select * from users where id=?').get(id)
        if (!row) return null
        const topicCount = this.countTopicsByUser(id)
        const pointCount = this.countPointsByUser(id)
        const commentCount = this.countCommentsByUser(id)
        const topics = topicCount > 0
          ? db.prepare('select id from topics where created_by=? order by created_at desc limit ?').all(id, USER_ACTIVITY_LIMIT).map((t) => t.id)
          : []
        const points = pointCount > 0
          ? db.prepare('select id from points where user_id=? order by created_at desc limit ?').all(id, USER_ACTIVITY_LIMIT).map((p) => p.id)
          : []
        const comments = commentCount > 0
          ? db.prepare('select id from comments where user_id=? order by created_at desc limit ?').all(id, USER_ACTIVITY_LIMIT).map((c) => c.id)
          : []
        return { ...row, topicCount, pointCount, commentCount, topics, points, comments }
      } catch {
        return null
      }
    }
    const users = readJson('users.json')
    const found = users.find((u)=> u.id===id)
    if (!found) return null
    const topics = Array.isArray(found.topics) ? found.topics : []
    const points = Array.isArray(found.points) ? found.points : []
    const comments = Array.isArray(found.comments) ? found.comments : []
    return { ...found, topics, points, comments, topicCount: topics.length, pointCount: points.length, commentCount: comments.length }
  },
  sumPointUpvotesByUser(userId) {
    if (db) {
      try { const r = db.prepare('select coalesce(sum(upvotes),0) as s from points where user_id=?').get(userId); return r?.s || 0 } catch { return 0 }
    }
    const points = readJson('points.json')
    return points.filter(p=>p.userId===userId).reduce((a,b)=> a + (b.upvotes||0), 0)
  },
  sumTopicScoreByUser(userId) {
    if (db) {
      try { const r = db.prepare('select coalesce(sum(score),0) as s from topics where created_by=?').get(userId); return r?.s || 0 } catch { return 0 }
    }
    const topics = readJson('topics.json')
    return topics.filter(t=>t.createdBy===userId || t.created_by===userId).reduce((a,b)=> a + (b.score||0), 0)
  },
  sumCommentUpvotesByUser(userId) {
    if (db) {
      try { const r = db.prepare('select coalesce(sum(upvotes),0) as s from comments where user_id=?').get(userId); return r?.s || 0 } catch { return 0 }
    }
    const all = readJson('comments.json')
    return all.filter(c=>c.userId===userId).reduce((a,b)=> a + (b.upvotes||0), 0)
  },
  countTopicsByUser(userId) {
    if (db) {
      try { const r = db.prepare('select count(*) as c from topics where created_by=?').get(userId); return r?.c || 0 } catch { return 0 }
    }
    const topics = readJson('topics.json')
    return topics.filter(t => (t.created_by || t.createdBy) === userId).length
  },
  countPointsByUser(userId) {
    if (db) {
      try { const r = db.prepare('select count(*) as c from points where user_id=?').get(userId); return r?.c || 0 } catch { return 0 }
    }
    const points = readJson('points.json')
    return points.filter(p => (p.user_id || p.userId) === userId).length
  },
  countCommentsByUser(userId) {
    if (db) {
      try { const r = db.prepare('select count(*) as c from comments where user_id=?').get(userId); return r?.c || 0 } catch { return 0 }
    }
    const comments = readJson('comments.json')
    return comments.filter(c => (c.user_id || c.userId) === userId).length
  },
  listUsers() {
    if (db) {
      try {
        try { db.prepare("alter table users add column role text default 'user'").run() } catch {}
        const rows = db.prepare(`
          select
            u.id,
            u.name,
            u.email,
            u.picture,
            u.role,
            coalesce((select count(*) from topics t where t.created_by = u.id), 0) as topicCount,
            coalesce((select count(*) from points p where p.user_id = u.id), 0) as pointCount,
            coalesce((select count(*) from comments c where c.user_id = u.id), 0) as commentCount
          from users u
        `).all()
        const targetId = 'u-1762500221827'
        const targetEmail = 'chaoting666@gmail.com'
        return rows.map(r => {
          const role = (r.id === targetId || r.email === targetEmail) ? 'superadmin' : (r.role || 'user')
          return { id: r.id, name: r.name, email: r.email, picture: r.picture, role, topicCount: Number(r.topicCount) || 0, pointCount: Number(r.pointCount) || 0, commentCount: Number(r.commentCount) || 0 }
        })
      } catch { return [] }
    }
    const users = readJson('users.json')
    const targetId = 'u-1762500221827'
    const targetEmail = 'chaoting666@gmail.com'
    return users.map(u => {
      const topics = Array.isArray(u.topics) ? u.topics : []
      const points = Array.isArray(u.points) ? u.points : []
      const comments = Array.isArray(u.comments) ? u.comments : []
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        picture: u.picture,
        role: (u.id===targetId||u.email===targetEmail)?'superadmin':(u.role||'user'),
        topics,
        points,
        comments,
        topicCount: topics.length,
        pointCount: points.length,
        commentCount: comments.length,
      }
    })
  },
  getStats() {
    if (db) {
      const count = (sql) => {
        try {
          const row = db.prepare(sql).get() || {}
          const value = row.c ?? row.count ?? 0
          return Number.isFinite(value) ? Number(value) : 0
        } catch {
          return 0
        }
      }
      const users = count('select count(*) as c from users')
      const guests = count('select count(*) as c from guests')
      const topics = count('select count(*) as c from topics')
      const points = count('select count(*) as c from points')
      const comments = count('select count(*) as c from comments')
      const reports = count('select count(*) as c from reports')
      // DAU: 今天有 last_seen 的使用者/訪客
      let dauUsers = 0
      try { dauUsers = db.prepare("select count(distinct user_id) as c from sessions where date(coalesce(last_seen, created_at)) = date('now','localtime')").get().c } catch {}
      let dauGuests = 0
      try { dauGuests = db.prepare("select count(*) as c from guests where date(last_seen) = date('now','localtime')").get().c } catch {}
      const dauTotal = (dauUsers || 0) + (dauGuests || 0)
      // MAU: 近 30 天（含今日）有 last_seen 的獨立使用者/訪客
      let mauUsers = 0
      try { mauUsers = db.prepare("select count(distinct user_id) as c from sessions where date(coalesce(last_seen, created_at)) >= date('now','-29 days','localtime')").get().c } catch {}
      let mauGuests = 0
      try { mauGuests = db.prepare("select count(*) as c from guests where date(last_seen) >= date('now','-29 days','localtime')").get().c } catch {}
      const mauTotal = (mauUsers || 0) + (mauGuests || 0)
      return { users, guests, topics, points, comments, reports, dauUsers, dauGuests, dauTotal, mauUsers, mauGuests, mauTotal }
    }
    const users = readJson('users.json').length
    let guests = 0; try { guests = readJson('guests.json').length } catch {}
    const topics = readJson('topics.json').length
    const points = readJson('points.json').length
    const comments = readJson('comments.json').length
    let reports = 0
    try { reports = readJson('reports.json').length } catch {}
    // JSON fallback：以今天的 last_seen 計算
    const today = new Date().toISOString().slice(0,10)
    const sessions = readJson('sessions.json')
    const dauUsers = new Set(sessions.filter(s => (s.last_seen||s.createdAt||'').slice(0,10)===today).map(s=>s.userId)).size
    let dauGuests = 0; try { dauGuests = readJson('guests.json').filter(g => (g.last_seen||'').slice(0,10)===today).length } catch {}
    const dauTotal = (dauUsers||0) + (dauGuests||0)
    // MAU: 近 30 天（含今日）
    const since = new Date(); since.setDate(since.getDate() - 29)
    const sinceIso = since.toISOString().slice(0,10)
    const mauUsers = new Set(sessions.filter(s => (s.last_seen||s.createdAt||'').slice(0,10) >= sinceIso).map(s=>s.userId)).size
    let mauGuests = 0; try { mauGuests = readJson('guests.json').filter(g => (g.last_seen||'').slice(0,10) >= sinceIso).length } catch {}
    const mauTotal = (mauUsers||0) + (mauGuests||0)
    return { users, guests, topics, points, comments, reports, dauUsers, dauGuests, dauTotal, mauUsers, mauGuests, mauTotal }
  },
  createLocalUser({ email, password_hash, name }) {
    const now = nowIso()
    if (db) {
      try { db.prepare('alter table users add column bio text').run() } catch {}
      const exist = db.prepare('select id from users where email=?').get(email)
      if (exist) return null
      const id = `u-${Date.now()}`
      db.prepare('insert into users (id,provider,email,email_verified,name,picture,bio,password_hash,created_at,last_login) values (?,?,?,?,?,?,?,?,?,?)')
        .run(id,'local',email,1,name||null,null,null,password_hash,now,now)
      return db.prepare('select * from users where id=?').get(id)
    }
    const users = readJson('users.json')
    if (users.some((u)=> u.email===email)) return null
    const u = { id: `u-${Date.now()}`, provider:'local', email, email_verified:true, name:name||null, picture:null, bio:null, password_hash, created_at: now, last_login: now }
    users.push(u); writeJson('users.json', users); return u
  },
  updateUserProfile(id, { name, bio }) {
    if (db) {
      try { db.prepare('alter table users add column bio text').run() } catch {}
      const row = db.prepare('select * from users where id=?').get(id)
      if (!row) return null
      const nextName = name !== undefined ? name : row.name
      db.prepare('update users set name=?, bio=? where id=?').run(nextName, bio ?? row.bio, id)
      return db.prepare('select * from users where id=?').get(id)
    }
    const users = readJson('users.json')
    const idx = users.findIndex((u)=> u.id===id)
    if (idx===-1) return null
    const next = { ...users[idx] }
    if (name !== undefined) {
      next.name = name
    }
    if (bio !== undefined) next.bio = bio
    users[idx] = next
    writeJson('users.json', users)
    return users[idx]
  },
  listGuests({ page = 1, size = 20, q = '' } = {}) {
    if (db) {
      try {
        let where = ''
        let params = []
        if (q && String(q).trim()) { where = 'where id like ? or name like ?'; const like = `%${String(q).trim()}%`; params = [like, like] }
        const total = db.prepare(`select count(*) as c from guests ${where}`).get(...params).c
        const items = db.prepare(`select * from guests ${where} order by last_seen desc limit ? offset ?`).all(...params, size, (page - 1) * size)
        return { items, total }
      } catch { return { items: [], total: 0 } }
    }
    try {
      let all = readJson('guests.json')
      if (q && String(q).trim()) {
        const qq = String(q).trim().toLowerCase()
        all = all.filter(g => (g.id||'').toLowerCase().includes(qq) || (g.name||'').toLowerCase().includes(qq))
      }
      const items = [...all].sort((a,b)=> new Date(b.last_seen||0) - new Date(a.last_seen||0)).slice((page-1)*size, (page-1)*size+size)
      return { items, total: all.length }
    } catch { return { items: [], total: 0 } }
  },
  createSession(userId, ttlDays = 30) {
    const token = `${userId}.${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
    const now = new Date()
    const expires = new Date(now.getTime() + ttlDays*24*60*60*1000)
    if (db) {
      try { db.prepare('alter table sessions add column last_seen text').run() } catch {}
      db.prepare('insert into sessions (id,user_id,token,created_at,expires_at,last_seen) values (?,?,?,?,?,?)')
        .run(`s-${Date.now()}`, userId, token, nowIso(), expires.toISOString(), nowIso())
      return { token, expiresAt: expires.toISOString() }
    }
    const sessions = readJson('sessions.json')
    sessions.push({ id: `s-${Date.now()}`, userId, token, createdAt: now.toISOString(), expiresAt: expires.toISOString(), last_seen: now.toISOString() })
    writeJson('sessions.json', sessions)
    return { token, expiresAt: expires.toISOString() }
  },
  updateSessionLastSeen(token) {
    const now = nowIso()
    if (db) { try { db.prepare('update sessions set last_seen=? where token=?').run(now, token) } catch {} ; return }
    const sessions = readJson('sessions.json')
    const idx = sessions.findIndex(s=>s.token===token)
    if (idx!==-1) { sessions[idx].last_seen = now; writeJson('sessions.json', sessions) }
  },
  removeSession(token) {
    if (db) {
      db.prepare('delete from sessions where token=?').run(token)
      return
    }
    const sessions = readJson('sessions.json')
    const idx = sessions.findIndex((s)=> s.token===token)
    if (idx!==-1) { sessions.splice(idx,1); writeJson('sessions.json', sessions) }
  },
  removeAllSessions(userId) {
    if (db) { db.prepare('delete from sessions where user_id=?').run(userId); return }
    const sessions = readJson('sessions.json').filter((s)=> s.userId!==userId)
    writeJson('sessions.json', sessions)
  },
  // 近 28 天每日新增觀點數 { date: 'YYYY-MM-DD', count: number } 陣列（含零填補）
  getPointsDailyCounts28d() {
    const days = 28
    const dateKey = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    start.setDate(start.getDate() - (days - 1))
    const map = new Map()
    if (db) {
      try {
        // 使用 localtime，並限定近 28 天
        const rows = db.prepare("select date(created_at,'localtime') as d, count(*) as c from points where date(created_at,'localtime') >= date('now','-27 days','localtime') group by date(created_at,'localtime')").all()
        rows.forEach(r => { map.set(String(r.d), Number(r.c)||0) })
      } catch {}
    } else {
      // JSON fallback：聚合 createdAt 到 YYYY-MM-DD
      const points = readJson('points.json')
      for (const p of points) {
        const d = new Date(p.createdAt || p.created_at || 0)
        if (isNaN(d.getTime())) continue
        const key = dateKey(d)
        map.set(key, (map.get(key) || 0) + 1)
      }
    }
    // 填補 28 天序列
    const out = []
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime())
      d.setDate(start.getDate() + i)
      const key = dateKey(d)
      out.push({ date: key, count: map.get(key) || 0 })
    }
    return out
  }
}

// initialize if possible
init()
