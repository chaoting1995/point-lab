#!/usr/bin/env node
// Recalculate comments count for each point (SQLite + JSON fallback)

import fs from 'node:fs'
import path from 'node:path'
import sqliteInit from 'better-sqlite3'

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const DATA_DIR = path.join(ROOT, 'data')
const DB_PATH = process.env.POINTLAB_DB_PATH || path.join(ROOT, 'pointlab.db')

function recountSqlite() {
  if (!fs.existsSync(DB_PATH)) {
    console.warn('[recount] SQLite DB not found, skip sqlite step')
    return
  }
  const db = sqliteInit(DB_PATH)
  db.pragma('journal_mode = WAL')
  const rows = db.prepare('select point_id as id, count(*) as cnt from comments group by point_id').all()
  const tx = db.transaction(() => {
    db.prepare('update points set comments = 0').run()
    const stmt = db.prepare('update points set comments=? where id=?')
    for (const row of rows) {
      stmt.run(row.cnt, row.id)
    }
  })
  tx()
  console.log(`[recount] sqlite updated ${rows.length} point(s)`)
}

function recountJson() {
  const pointsPath = path.join(DATA_DIR, 'points.json')
  if (!fs.existsSync(pointsPath)) {
    console.warn('[recount] server/data/points.json not found, skip json step')
    return
  }
  const commentsPath = path.join(DATA_DIR, 'comments.json')
  const points = JSON.parse(fs.readFileSync(pointsPath, 'utf-8') || '[]')
  const comments = fs.existsSync(commentsPath)
    ? (JSON.parse(fs.readFileSync(commentsPath, 'utf-8') || '[]'))
    : []
  const counts = {}
  for (const c of comments) {
    const pid = c.pointId || c.point_id
    if (!pid) continue
    counts[pid] = (counts[pid] || 0) + 1
  }
  let updated = 0
  for (const pt of points) {
    const pid = pt.id
    const next = counts[pid] || 0
    if ((pt.comments || 0) !== next) {
      pt.comments = next
      updated++
    }
  }
  fs.writeFileSync(pointsPath, JSON.stringify(points, null, 2), 'utf-8')
  console.log(`[recount] json updated ${updated} point(s)`)
}

function main() {
  recountSqlite()
  recountJson()
  console.log('[recount] done')
}

main()
