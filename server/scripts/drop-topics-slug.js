#!/usr/bin/env node
// One-off migration to drop `slug` column from `topics` in SQLite.
// Usage: POINTLAB_DB_PATH=/path/to/pointlab.db node server/scripts/drop-topics-slug.js

import path from 'node:path'
import fs from 'node:fs'

let sqlite = null
try { sqlite = await import('better-sqlite3').then(m => m.default || m) } catch {}
if (!sqlite) {
  console.error('[migrate] better-sqlite3 not available. Abort.')
  process.exit(1)
}

const DB_PATH = process.env.POINTLAB_DB_PATH || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'pointlab.db')
if (!fs.existsSync(DB_PATH)) {
  console.error('[migrate] DB not found:', DB_PATH)
  process.exit(1)
}

const db = sqlite(DB_PATH)
db.pragma('journal_mode = WAL')

function hasSlug() {
  const cols = db.prepare("PRAGMA table_info(topics)").all()
  return cols.some(c => String(c.name).toLowerCase() === 'slug')
}

if (!hasSlug()) {
  console.log('[migrate] topics.slug not present. Nothing to do.')
  process.exit(0)
}

const tx = db.transaction(() => {
  // Create new table without slug
  db.exec(`
    create table topics_new (
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
  `)
  // Copy data
  db.exec(`insert into topics_new (id,name,description,mode,created_by,created_by_guest,score,count,created_at)
           select id,name,description,coalesce(mode,'open'),created_by,created_by_guest,coalesce(score,0),coalesce(count,0),created_at from topics;`)
  // Replace
  db.exec('drop table topics;')
  db.exec('alter table topics_new rename to topics;')
  // Recreate indexes
  db.exec(`
    create index if not exists idx_topics_created on topics(created_at desc);
    create index if not exists idx_topics_score on topics(score desc, created_at asc);
  `)
})

try { tx(); console.log('[migrate] topics.slug dropped successfully.') } catch (e) {
  console.error('[migrate] failed:', e)
  process.exit(1)
}

