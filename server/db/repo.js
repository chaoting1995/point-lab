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
const DB_PATH = process.env.POINTLAB_DB_PATH || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'pointlab.db')

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
        foreign key(user_id) references users(id) on delete cascade
      );
      create table if not exists reports (
        id text primary key,
        type text not null,
        target_id text not null,
        user_id text,
        reason text,
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
    return true
  } catch {
    db = null
    return false
  }
}

function nowIso() { return new Date().toISOString() }

export const repo = {
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
  addReport({ id, type, targetId, userId, reason }) {
    const now = nowIso()
    if (db) {
      db.prepare('insert into reports (id,type,target_id,user_id,reason,created_at) values (?,?,?,?,?,?)')
        .run(id, type, targetId, userId || null, reason || null, now)
      return { id, type, targetId, userId, reason, createdAt: now }
    }
    const all = readJson('reports.json')
    const rec = { id, type, targetId, userId, reason, createdAt: now }
    all.push(rec); writeJson('reports.json', all); return rec
  },
  listReports(type) {
    if (db) {
      const rows = type ? db.prepare('select * from reports where type=? order by created_at desc').all(type)
                        : db.prepare('select * from reports order by created_at desc').all()
      return rows.map(r => ({ id: r.id, type: r.type, targetId: r.target_id, userId: r.user_id, reason: r.reason, createdAt: r.created_at }))
    }
    const all = readJson('reports.json')
    return type ? all.filter(r=>r.type===type) : all
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
  getTopic(idOrSlug) {
    if (db) {
      const row = db.prepare('select * from topics where id=? or slug=?').get(idOrSlug, idOrSlug)
      return row || null
    }
    const topics = readJson('topics.json')
    return topics.find(t => t.id === idOrSlug || t.slug === idOrSlug) || null
  },
  createTopic({ id, name, description, mode, createdBy, createdByGuest, author }) {
    if (db) {
      try { db.prepare('alter table topics add column created_by text').run() } catch {}
      try { db.prepare('alter table topics add column created_by_guest text').run() } catch {}
      db.prepare('insert into topics (id,name,description,slug,mode,score,count,created_at) values (?,?,?,?,?,?,?,?)')
        .run(id, name, description, description ? null : null, mode, 0, 0, nowIso())
      if (createdBy) { try { db.prepare('update topics set created_by=? where id=?').run(createdBy, id) } catch {} }
      if (createdByGuest) { try { db.prepare('update topics set created_by_guest=? where id=?').run(createdByGuest, id) } catch {} }
      if (createdByGuest) this.incGuestCounter(createdByGuest, 'topic')
      if (createdBy) this.appendUserItem(createdBy, 'topics', id)
      return this.getTopic(id)
    }
    const topics = readJson('topics.json')
    const rec = { id, name, description, slug: name, mode, score: 0, count: 0, createdAt: nowIso(), createdBy: createdBy || null, createdByGuest: createdByGuest || null, author }
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
      if (rec.userId) this.appendUserItem(rec.userId, 'points', rec.id)
      if (rec.guestId) this.incGuestCounter(rec.guestId, 'point')
      return this.getPoint(rec.id)
    }
    const points = readJson('points.json')
    points.unshift({ ...rec, userId: rec.userId || null, guestId: rec.guestId || null })
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
      if (userId) this.appendUserItem(userId, 'comments', id)
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
    if (db) {
      this.ensureUserActivityColumns()
      const row = db.prepare('select id, topics_json, points_json, comments_json from users where id=?').get(userId)
      if (!row) return
      const parse = (s)=>{ try { return JSON.parse(s||'[]') } catch { return [] } }
      const toStr = (arr)=> JSON.stringify(Array.from(new Set(arr)))
      if (kind==='topics') {
        const arr = parse(row.topics_json); arr.push(itemId)
        db.prepare('update users set topics_json=? where id=?').run(toStr(arr), userId)
      } else if (kind==='points') {
        const arr = parse(row.points_json); arr.push(itemId)
        db.prepare('update users set points_json=? where id=?').run(toStr(arr), userId)
      } else if (kind==='comments') {
        const arr = parse(row.comments_json); arr.push(itemId)
        db.prepare('update users set comments_json=? where id=?').run(toStr(arr), userId)
      }
      return
    }
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
        db.prepare('update users set email=?, email_verified=?, name=?, picture=?, last_login=? where id=?')
          .run(email || row.email, email_verified?1:0, name || row.name, picture || row.picture, now, row.id)
        return db.prepare('select * from users where id=?').get(row.id)
      }
      const id = `u-${Date.now()}`
      db.prepare('insert into users (id,provider,provider_user_id,email,email_verified,name,picture,bio,created_at,last_login) values (?,?,?,?,?,?,?,?,?,?)')
        .run(id,'google',sub,email||null,email_verified?1:0,name||null,picture||null,null,now,now)
      return db.prepare('select * from users where id=?').get(id)
    }
    const users = readJson('users.json')
    let u = users.find((x)=> x.provider==='google' && x.provider_user_id===sub)
    if (u) {
      u = { ...u, email: email || u.email, email_verified: !!email_verified, name: name || u.name, picture: picture || u.picture, last_login: now }
    } else {
      u = { id: `u-${Date.now()}`, provider: 'google', provider_user_id: sub, email, email_verified: !!email_verified, name, picture, bio: null, created_at: now, last_login: now }
      users.push(u)
    }
    writeJson('users.json', users)
    return u
  },
  getUserByEmail(email) {
    if (db) return db.prepare('select * from users where email=?').get(email) || null
    const users = readJson('users.json')
    return users.find((u)=> u.email===email) || null
  },
  getUserById(id) {
    if (db) return db.prepare('select * from users where id=?').get(id) || null
    const users = readJson('users.json')
    return users.find((u)=> u.id===id) || null
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
  listUsers() {
    if (db) {
      try {
        // 確保相容舊資料庫（補齊可能缺少的欄位）
        try { db.prepare("alter table users add column role text default 'user'").run() } catch {}
        try { db.prepare('alter table users add column topics_json text').run() } catch {}
        try { db.prepare('alter table users add column points_json text').run() } catch {}
        try { db.prepare('alter table users add column comments_json text').run() } catch {}
        const rows = db.prepare('select id,name,email,picture,role,topics_json,points_json,comments_json from users').all()
        const parse = (s)=>{ try { return JSON.parse(s||'[]') } catch { return [] } }
        const targetId = 'u-1762500221827'
        const targetEmail = 'chaoting666@gmail.com'
        return rows.map(r => {
          const role = (r.id === targetId || r.email === targetEmail) ? 'superadmin' : (r.role || 'user')
          return { id: r.id, name: r.name, email: r.email, picture: r.picture, role, topics: parse(r.topics_json), points: parse(r.points_json), comments: parse(r.comments_json) }
        })
      } catch { return [] }
    }
    const users = readJson('users.json')
    const targetId = 'u-1762500221827'
    const targetEmail = 'chaoting666@gmail.com'
    return users.map(u => ({ id: u.id, name: u.name, email: u.email, picture: u.picture, role: (u.id===targetId||u.email===targetEmail)?'superadmin':(u.role||'user'), topics: Array.isArray(u.topics)?u.topics:[], points: Array.isArray(u.points)?u.points:[], comments: Array.isArray(u.comments)?u.comments:[] }))
  },
  getStats() {
    if (db) {
      try {
        const q = (sql)=> db.prepare(sql).get().c
        const users = q('select count(*) as c from users')
        const topics = q('select count(*) as c from topics')
        const points = q('select count(*) as c from points')
        const comments = q('select count(*) as c from comments')
        let reports = 0
        try { reports = q('select count(*) as c from reports') } catch {}
        return { users, topics, points, comments, reports }
      } catch { return { users: 0, topics: 0, points: 0, comments: 0, reports: 0 } }
    }
    const users = readJson('users.json').length
    const topics = readJson('topics.json').length
    const points = readJson('points.json').length
    const comments = readJson('comments.json').length
    let reports = 0
    try { reports = readJson('reports.json').length } catch {}
    return { users, topics, points, comments, reports }
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
      db.prepare('update users set name=?, bio=? where id=?').run(name ?? row.name, bio ?? row.bio, id)
      return db.prepare('select * from users where id=?').get(id)
    }
    const users = readJson('users.json')
    const idx = users.findIndex((u)=> u.id===id)
    if (idx===-1) return null
    users[idx] = { ...users[idx], ...(name!==undefined?{name}:{}), ...(bio!==undefined?{bio}:{} ) }
    writeJson('users.json', users)
    return users[idx]
  },
  createSession(userId, ttlDays = 30) {
    const token = `${userId}.${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
    const now = new Date()
    const expires = new Date(now.getTime() + ttlDays*24*60*60*1000)
    if (db) {
      db.prepare('insert into sessions (id,user_id,token,created_at,expires_at) values (?,?,?,?,?)')
        .run(`s-${Date.now()}`, userId, token, nowIso(), expires.toISOString())
      return { token, expiresAt: expires.toISOString() }
    }
    const sessions = readJson('sessions.json')
    sessions.push({ id: `s-${Date.now()}`, userId, token, createdAt: now.toISOString(), expiresAt: expires.toISOString() })
    writeJson('sessions.json', sessions)
    return { token, expiresAt: expires.toISOString() }
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
  }
}

// initialize if possible
init()
