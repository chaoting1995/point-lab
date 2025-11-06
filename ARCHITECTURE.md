# PointLab – 架構與決策

本檔描述高層組件、資料流、API、部署與重要設計決策，作為維護與擴充的參考。

## 高層結構
- 前端（`/src`）：React + TypeScript + Vite + MUI + Tailwind
  - 路由頁（`src/pages/*`）與可復用元件（`src/components/*`）
  - i18n：`src/i18n/*` 提供語系與繁→簡轉換（opencc-js）
  - API 客戶端：`src/api/client.ts`，支援 `VITE_API_BASE`
- 後端（`/server`）：Express REST API
  - 主要入口：`server/index.js`
  - Repository：`server/db/repo.js`（SQLite/JSON 雙實作）
  - 匯入腳本：`server/scripts/migrate-from-json.js`

## 資料流
1. 前端透過 `getJson()` 呼叫 `/api/*`。
2. 後端路由在 `server/index.js` 解析參數，再委派到 `repo.js`。
3. `repo.js` 優先使用 SQLite（better-sqlite3）；若未安裝（或初始化失敗）則回退 JSON 檔。
4. 回應以 `{ items, total }` 或 `{ data }` 格式返回，前端據以渲染。

## API 一覽
- 健診：`GET /api/health`
- Topics：
  - `GET /api/topics?page&size&sort=new|hot|old`
  - `GET /api/topics/id/:id`
  - `POST /api/topics`（name, description?, mode=open|duel）
  - `PATCH /api/topics/:id`（name/description/mode）
  - `PATCH|POST /api/topics/:id/vote`（Body: { delta: 1|-1 }）
  - `DELETE /api/topics/:id`
- Points：
  - `GET /api/points?topic=<id>&page&size&sort=new|hot|old|top`
  - `GET /api/points/:id`
  - `POST /api/points`（description, topicId?, authorName?, authorType=guest|user, position?=agree|others）
  - `PATCH /api/points/:id`（description/position）
  - `DELETE /api/points/:id`

備註：舊路由 `/api/hacks` 已移除；僅在匯入腳本保留對舊檔名 `hacks.json` 的兼容。

## 資料庫與 Schema
- 引擎：better-sqlite3（WAL 模式），檔案 `server/pointlab.db`
- Schema（簡述）：
  - `topics(id text pk, name, description, slug, mode 'open'|'duel', score int, count int, created_at text)`
  - `points(id text pk, topic_id fk, description, author_name, author_type, position, upvotes, comments, shares, created_at text)`
- 索引：topics(created_at/score)、points(topic_id/position/created_at)
- 匯入：`npm run migrate:json` 將 `server/data/topics.json` 與 `points.json(相容 hacks.json)` 匯入 DB。

## 前端頁面與元件（摘要）
- TopicsPage：列表/排序/空狀態（`src/pages/TopicsPage.tsx`）
- TopicDetail / Add / Edit：主題詳情與表單
- PointAdd / Edit：觀點新增與編輯
- Header / TopicCard / PointCard / SortTabs / ConfirmDialog 等通用元件

## 部署與執行
- 單機：`npm run build` 產生 `dist/`，`npm run server` 同時服務靜態與 API。
- 前後端分離：前端（Pages/Netlify/Vercel）+ 後端（Fly.io）。
- CORS 由 `ALLOWED_ORIGINS` 控制（逗號分隔）。
- 生產前端請設 `VITE_API_BASE` 指向後端域名。

## 設計決策與取捨
- 資料層雙模：為降低初期阻力，SQLite 與 JSON 並存；SQLite 可擴展、交易安全，JSON 僅作 fallback/備援。
- 路由命名統一：API 使用 `points`，舊名 `hacks` 已移除以避免混淆（前端命名後續逐步統一）。
- 效能：列表排序/分頁交由 DB；JSON 模式為整檔處理，非目標長期方案。
- 穩定性：開發時禁用 etag、no-store，避免快取導致 JSON 空回應。

## 已知待辦
- 前端將 `Hack*` 元件與靜態資料逐步重命名為 `Point*`。
- JSON 模式加原子寫入（tmp+rename）與簡易鎖。
- 提供 OpenAPI 規格或 endpoints 文件，便於第三方整合與快速檢查。

