// Migrate data from server/data/*.json into SQLite (pointlab.db)
// Usage: node server/scripts/migrate-from-json.js
import fs from 'node:fs'
import path from 'node:path'
import sqliteInit from 'better-sqlite3'

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const DATA_DIR = path.join(ROOT, 'data')
// Respect external DB path when provided (e.g., Fly volume mount)
const DB_PATH = process.env.POINTLAB_DB_PATH || path.join(ROOT, 'pointlab.db')

function readJson(file, fallback = []) {
  try {
    const p = path.join(DATA_DIR, file)
    return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {
    return fallback
  }
}

function ensureSchema(db) {
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
}

function main() {
  const db = sqliteInit(DB_PATH)
  ensureSchema(db)

  const topics = readJson('topics.json', [])
  const points = readJson('points.json', [])

  const insertTopic = db.prepare(`insert into topics (id,name,description,slug,mode,score,count,created_at)
    values (@id,@name,@description,@slug,@mode,@score,@count,@created_at)
    on conflict(id) do update set
      name=excluded.name,
      description=excluded.description,
      slug=excluded.slug,
      mode=excluded.mode,
      score=excluded.score,
      count=excluded.count,
      created_at=excluded.created_at
  `)
  const insertPoint = db.prepare(`insert into points (id,topic_id,description,author_name,author_type,position,upvotes,comments,shares,created_at)
    values (@id,@topic_id,@description,@author_name,@author_type,@position,@upvotes,@comments,@shares,@created_at)
    on conflict(id) do update set
      topic_id=excluded.topic_id,
      description=excluded.description,
      author_name=excluded.author_name,
      author_type=excluded.author_type,
      position=excluded.position,
      upvotes=excluded.upvotes,
      comments=excluded.comments,
      shares=excluded.shares,
      created_at=excluded.created_at
  `)

  const tx = db.transaction(() => {
    const topicIds = new Set()
    const incCount = new Map()
    for (const t of topics) {
      const row = {
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        slug: t.slug ?? null,
        mode: t.mode === 'duel' ? 'duel' : 'open',
        score: typeof t.score === 'number' ? t.score : 0,
        count: typeof t.count === 'number' ? t.count : 0,
        created_at: t.createdAt || new Date().toISOString(),
      }
      insertTopic.run(row)
      topicIds.add(row.id)
    }

    for (const h of points) {
      const row = {
        id: h.id,
        topic_id: h.topicId || null,
        description: h.description,
        author_name: h.author?.name || null,
        author_type: h.author?.role || null,
        position: h.position || (h.stance === 'pro' ? 'agree' : h.stance === 'other' ? 'others' : null),
        upvotes: typeof h.upvotes === 'number' ? h.upvotes : 0,
        comments: typeof h.comments === 'number' ? h.comments : 0,
        shares: typeof h.shares === 'number' ? h.shares : 0,
        created_at: h.createdAt || new Date().toISOString(),
      }
      if (row.topic_id && !topicIds.has(row.topic_id)) {
        // 建立 placeholder topic，避免 FK 失敗
        const placeholder = {
          id: row.topic_id,
          name: 'Imported Topic',
          description: null,
          slug: null,
          mode: 'open',
          score: 0,
          count: 0,
          created_at: row.created_at,
        }
        insertTopic.run(placeholder)
        topicIds.add(row.topic_id)
      }
      insertPoint.run(row)
      if (row.topic_id) {
        incCount.set(row.topic_id, (incCount.get(row.topic_id) || 0) + 1)
      }
    }

    // 回寫 topics.count
    const updateCount = db.prepare('update topics set count = ? where id = ?')
    for (const [tid, cnt] of incCount.entries()) {
      updateCount.run(cnt, tid)
    }
  })

  tx()

  console.log(`Migration completed. Topics: ${topics.length}, Points: ${points.length}`)
}

main()
