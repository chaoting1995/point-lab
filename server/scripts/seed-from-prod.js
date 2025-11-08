#!/usr/bin/env node
// Seed local SQLite from production API (topics + points)
// Usage: POINTLAB_DB_PATH=server/pointlab.db node server/scripts/seed-from-prod.js [API_BASE]
// Default API_BASE: https://pointlab-api.fly.dev

import fs from 'node:fs'
import path from 'node:path'
import sqliteInit from 'better-sqlite3'

const API_BASE = process.argv[2] || 'https://pointlab-api.fly.dev'
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const DB_PATH = process.env.POINTLAB_DB_PATH || path.join(ROOT, 'pointlab.db')

function ensureSchema(db) {
  db.pragma('journal_mode = WAL')
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
  `)
  // Backfill missing columns on existing DBs
  const tcols = db.prepare("PRAGMA table_info(topics)").all().map(c=>String(c.name))
  if (!tcols.includes('created_by')) { try { db.exec("alter table topics add column created_by text") } catch {} }
  if (!tcols.includes('created_by_guest')) { try { db.exec("alter table topics add column created_by_guest text") } catch {} }
  if (!tcols.includes('mode')) { try { db.exec("alter table topics add column mode text default 'open'") } catch {} }
  if (!tcols.includes('score')) { try { db.exec("alter table topics add column score integer default 0") } catch {} }
  if (!tcols.includes('count')) { try { db.exec("alter table topics add column count integer default 0") } catch {} }
  const pcols = db.prepare("PRAGMA table_info(points)").all().map(c=>String(c.name))
  if (!pcols.includes('user_id')) { try { db.exec("alter table points add column user_id text") } catch {} }
  if (!pcols.includes('guest_id')) { try { db.exec("alter table points add column guest_id text") } catch {} }
  if (!pcols.includes('author_name')) { try { db.exec("alter table points add column author_name text") } catch {} }
  if (!pcols.includes('author_type')) { try { db.exec("alter table points add column author_type text") } catch {} }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`)
  return res.json()
}

async function main() {
  if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = sqliteInit(DB_PATH)
  ensureSchema(db)

  const insertTopic = db.prepare(`insert into topics (id,name,description,mode,created_by,created_by_guest,score,count,created_at)
    values (@id,@name,@description,@mode,@created_by,@created_by_guest,@score,@count,@created_at)
    on conflict(id) do update set
      name=excluded.name,
      description=excluded.description,
      mode=excluded.mode,
      created_by=excluded.created_by,
      created_by_guest=excluded.created_by_guest,
      score=excluded.score,
      count=excluded.count,
      created_at=excluded.created_at
  `)
  const insertPoint = db.prepare(`insert into points (id,topic_id,user_id,guest_id,description,author_name,author_type,position,upvotes,comments,shares,created_at)
    values (@id,@topic_id,@user_id,@guest_id,@description,@author_name,@author_type,@position,@upvotes,@comments,@shares,@created_at)
    on conflict(id) do update set
      topic_id=excluded.topic_id,
      user_id=excluded.user_id,
      guest_id=excluded.guest_id,
      description=excluded.description,
      author_name=excluded.author_name,
      author_type=excluded.author_type,
      position=excluded.position,
      upvotes=excluded.upvotes,
      comments=excluded.comments,
      shares=excluded.shares,
      created_at=excluded.created_at
  `)

  const topicsUrl = `${API_BASE.replace(/\/$/,'')}/api/topics?page=1&size=1000&sort=new`
  const topicsResp = await fetchJson(topicsUrl)
  const topics = topicsResp.items || []
  console.log(`[seed] topics fetched: ${topics.length}`)

  const tx = db.transaction(() => {
    for (const t of topics) {
      const row = {
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        mode: t.mode === 'duel' ? 'duel' : 'open',
        created_by: t.createdBy || t.created_by || null,
        created_by_guest: t.createdByGuest || t.created_by_guest || null,
        score: typeof t.score === 'number' ? t.score : 0,
        count: typeof t.count === 'number' ? t.count : 0,
        created_at: t.createdAt || new Date().toISOString(),
      }
      insertTopic.run(row)
    }
  })
  tx()

  // Points per topic (paginate up to 1000)
  let totalPoints = 0
  for (const t of topics) {
    let page = 1
    const size = 200
    while (true) {
      const url = `${API_BASE.replace(/\/$/,'')}/api/points?topic=${encodeURIComponent(t.id)}&page=${page}&size=${size}&sort=new`
      const resp = await fetchJson(url)
      const items = resp.items || []
      if (!items.length) break
      const ptx = db.transaction(() => {
        for (const p of items) {
          const row = {
            id: p.id,
            topic_id: p.topicId || p.topic_id || t.id,
            user_id: p.userId || p.user_id || null,
            guest_id: p.guestId || p.guest_id || null,
            description: p.description,
            author_name: p.author?.name || p.author_name || null,
            author_type: p.author?.role || p.author_type || null,
            position: p.position || null,
            upvotes: typeof p.upvotes === 'number' ? p.upvotes : 0,
            comments: typeof p.comments === 'number' ? p.comments : 0,
            shares: typeof p.shares === 'number' ? p.shares : 0,
            created_at: p.createdAt || new Date().toISOString(),
          }
          insertPoint.run(row)
          totalPoints++
        }
      })
      ptx()
      if (items.length < size) break
      page += 1
    }
  }

  console.log(`[seed] done. topics=${topics.length}, points=${totalPoints}`)
}

main().catch((e) => { console.error('[seed] failed:', e); process.exit(1) })
