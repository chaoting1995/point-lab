#!/usr/bin/env node
// Fetch topics + points from a remote API and write to JSON fallback files
// Usage: node server/scripts/seed-json-from-prod.js [API_BASE]
// Default API_BASE: https://pointlab-api.fly.dev

import fs from 'node:fs'
import path from 'node:path'

const API_BASE = process.argv[2] || 'https://pointlab-api.fly.dev'
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const DATA_DIR = path.join(ROOT, 'data')

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`)
  return res.json()
}

function writeJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8')
}

async function main() {
  const topicsUrl = `${API_BASE.replace(/\/$/, '')}/api/topics?page=1&size=1000&sort=new`
  const tResp = await fetchJson(topicsUrl)
  const topics = (tResp.items || []).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description || null,
    slug: null,
    mode: t.mode === 'duel' ? 'duel' : 'open',
    score: typeof t.score === 'number' ? t.score : 0,
    count: typeof t.count === 'number' ? t.count : 0,
    createdAt: t.createdAt || new Date().toISOString(),
  }))
  writeJson('topics.json', topics)

  const points = []
  for (const t of topics) {
    let page = 1
    const size = 200
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const url = `${API_BASE.replace(/\/$/,'')}/api/points?topic=${encodeURIComponent(t.id)}&page=${page}&size=${size}&sort=new`
      const resp = await fetchJson(url)
      const items = resp.items || []
      if (!items.length) break
      for (const p of items) {
        points.push({
          id: p.id,
          topicId: p.topicId || t.id,
          description: p.description,
          author: p.author || null,
          position: p.position || null,
          upvotes: typeof p.upvotes === 'number' ? p.upvotes : 0,
          comments: typeof p.comments === 'number' ? p.comments : 0,
          shares: typeof p.shares === 'number' ? p.shares : 0,
          createdAt: p.createdAt || new Date().toISOString(),
        })
      }
      if (items.length < size) break
      page += 1
    }
  }
  writeJson('points.json', points)
  console.log(`[seed-json] wrote ${topics.length} topics and ${points.length} points to server/data/`)
}

main().catch(e => { console.error('[seed-json] failed:', e); process.exit(1) })

