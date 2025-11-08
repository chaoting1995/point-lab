# PointLab – AGENTS 指南（給代理/AI 助手）

本文件提供機器導向的快速上手摘要，讓代理在無上下文啟動時，能立即掌握專案現況與工作規則。

## 專案定位
- 目標：觀點/主題實驗網站（參考 50hacks.co）。
- 前端：React + TypeScript + Vite + MUI + Tailwind（Nunito 字體）。
- 後端：Express 提供 REST API；資料層支援 SQLite（better-sqlite3）或 JSON 檔 fallback。
- 多語：UI 文案支援 繁/簡/英；使用者輸入內容不自動翻譯。繁→簡使用 opencc-js。

## 快速啟動
- 安裝：`npm install`
- 同啟前後端（推薦）：`npm run dev:all`
  - 前端：Vite 預設 `http://localhost:5174`
  - 後端：Express `http://localhost:8787`
- 僅前端：`npm run dev`（需另啟 `npm run server`）
- 僅後端：`npm run server`
- Build/預覽：`npm run build` / `npm run preview`

## 重要環境變數
- 前端：`VITE_API_BASE`（部署分離時指向後端完整域名），`VITE_GOOGLE_CLIENT_ID`（可選）
- 後端：`ALLOWED_ORIGINS`（CORS 白名單，逗號分隔）、`PORT`（預設 8787）

## API 速覽（穩定介面）
- 健診：`GET /api/health`
- 診斷（開發）：`GET /api/_diag` → `{ sqlite, dbPath, topicsDb, pointsDb, topicsJson, pointsJson }`
- 數據概覽：`GET /api/stats/overview` → `{ topics, points, comments, visits }`（visits 取近 30 天造訪總人次）
- Topics：
  - `GET /api/topics?page&size&sort=new|hot|old`
  - `GET /api/topics/id/:id`（僅支援 id；slug 已移除）
  - `POST /api/topics`（name, description?, mode=open|duel；若用戶已登入，後端會記錄 created_by=userId）
  - `PATCH /api/topics/:id`（name/description/mode）
  - `PATCH|POST /api/topics/:id/vote`（Body: { delta: 1|-1 }）
  - `DELETE /api/topics/:id`
- Points：
  - `GET /api/points?topic=<id>&page&size&sort=new|hot|old|top`
  - `GET /api/points/:id`
  - `POST /api/points`（description, topicId?, authorName?, authorType=guest|user, position?=agree|others；若用戶已登入，後端記錄 userId，authorType 覆寫為 user）
  - `PATCH|POST /api/points/:id/vote`（Body: { delta: 1|-1|±2 }；三態切換時可能為 ±2）
  - `PATCH /api/points/:id`（description/position）
  - `DELETE /api/points/:id`
  - Comments（新）：
    - `GET /api/points/:id/comments?sort=old|new|hot&page&size[&parent=<cid>]`（回傳 childCount 供一級顯示）
    - `POST /api/points/:id/comments`（content, parentId?, authorName?, authorType?；若用戶已登入，後端記錄 userId，authorType 覆寫為 user）
    - `PATCH /api/comments/:id/vote`（Body: { delta: 1|-1|±2 }，允許為負數）
- 備註：舊路由 `/api/hacks` 已移除。舊 `GET /api/topics/:slug` 亦已移除，前後端全面改用 `id`。

## 資料層策略
- 優先使用 SQLite（`server/pointlab.db`，better-sqlite3）。不存在時自動退回 JSON 檔（`server/data/*.json`）。
- 一次性匯入：`npm run migrate:json` 將 `topics.json / points.json` 匯入 SQLite。
- 移除欄位（SQLite）：`POINTLAB_DB_PATH=/path/to/pointlab.db npm run migrate:drop-slug`（移除 `topics.slug`）。
- 種子資料：
  - 從正式站匯入到 SQLite：`POINTLAB_DB_PATH=server/pointlab.db npm run seed:from-prod`（會同步 topics / points / comments）
  - 快速補 JSON（fallback 用）：`node server/scripts/seed-json-from-prod.js`（會寫入 `topics.json`/`points.json`/`comments.json`）
- 匯入後若觀點卡片的評論數與實際留言不符，可執行 `npm run recount:comments` 重新計算（同時更新 SQLite 與 JSON fallback）。
- ⚠️ 未經使用者在當前工作中明確指示，**禁止**執行任何會覆蓋本機資料的匯入腳本（`seed:from-prod`、`seed-json-from-prod`、手動複製正式站 DB 等），避免毀損使用者剛建立的主題/觀點。

## 主要目錄與檔案
- 後端：
  - `server/index.js` – Express API 與 SPA 靜態服務（若存在 `dist/`）。
  - `server/db/repo.js` – 資料庫/JSON 雙實作 repository。
  - `server/scripts/migrate-from-json.js` – 匯入腳本（不再含 slug）。
  - `server/scripts/drop-topics-slug.js` – SQLite 遷移：移除 `topics.slug`。
  - `server/scripts/seed-from-prod.js` – 從正式站 API 匯入到本機 SQLite。
  - `server/scripts/seed-json-from-prod.js` – 從正式站 API 匯入到 `server/data/*.json`（fallback）。
- 前端：
  - `src/pages/*` – 頁面（Topics/TopicDetail/PointAdd...）。
  - `src/components/*` – UI 元件（Header/TopicCard/PointCard/SortTabs...）。
  - `src/i18n/*` – 多語 hooks 與字典。
  - `src/api/client.ts` – fetch 包裝（支援 `VITE_API_BASE`）。

## 編碼與提交規範（對代理）
- 變更應「小而準」，避免無關重構；優先修正根因。
- 語言：TypeScript/ESM；避免新增一字母變數名；維持現有程式風格。
- 後端 API：僅在 `server/index.js` 增刪；資料邏輯寫在 `server/db/repo.js`。
- JSON fallback：統一讀寫 `points.json`/`topics.json`；不得再新增 `hacks.json`。
- 文件：如變更 API 或資料層，務必同步更新 README 與本文。
- 投票行為：三態（未投/讚/倒讚），允許為負數；前端以 localStorage 記錄用戶對單項的投票狀態。
- i18n：不得再保留 `t('key') || 'fallback'` 的寫法；若缺字請補齊字典，而不是加硬編碼備援。
 - Git 提交規範：commit message 僅允許單行摘要（不超過 72 字元）。詳細變更請寫入 `CHANGELOG.md`，必要時在 PR 描述補充。

## 常見陷阱
- CORS：記得設定 `ALLOWED_ORIGINS`；本地開發允許全部。
- Vite 代理：開發時 `/api` 代理到 8787，部署分離需設 `VITE_API_BASE`。
- SQLite/JSON 切換：better-sqlite3 缺失時自動回退；注意 JSON 檔案寫入的原子性（短期內使用者風險接受）。
- 前端命名已統一為 Point，避免與舊 Hack 命名混用。
  - 若本機落入 JSON fallback，可用 `GET /api/_diag` 檢查；短期可用 `seed-json-from-prod.js` 快速補資料。

## TODO / Roadmap（簡版）
- JSON 模式增強：原子寫入（tmp+rename）、簡易鎖、Schema 驗證。
- API 規格文件：提供 `openapi.yaml` 或 `docs/endpoints.md`。
- 資料庫升級：抽象層介面與遷移腳本強化；持續 E2E 驗證。

---
本檔為機器導向說明，指令與行為以此為準；如與 README 衝突，請以最新的代碼與本檔規範為優先。

## 部署策略與維運（新增）

- 前端（Cloudflare Pages）
  - Production 分支：`master`，push 會自動部署。
  - 環境變數：`VITE_API_BASE=https://pointlab-api.fly.dev`（UI 設定優先生效，否則讀 `.env.production`）。
  - 注意：所有 fetch 需經 `withBase()`（已統一），避免在 Pages 上誤打相對路徑造成 405。

- 後端（Fly.io）
  - App：`pointlab-api`，Region：`sin`。
  - 常駐：`min_machines_running=1`，健康檢查 `/api/health`。
  - CORS：`ALLOWED_ORIGINS` 應包含 Pages 網域（例：`https://point-lab.pages.dev`）。
  - DB：SQLite 檔於 Volume `/app/data/pointlab.db`，程式會讀取 `POINTLAB_DB_PATH`，否則預設 `server/pointlab.db`。

- 首次部署/維運指令（package.json 已提供快捷腳本）
  - 登入：`npm run fly:login`
  - 建立 Volume：`npm run fly:volume`（region 對齊 `fly.toml`）
  - 設定 CORS：`PAGES_ORIGIN=https://point-lab.pages.dev npm run fly:set-origins`
  - 部署：`npm run fly:deploy`；狀態/日誌：`npm run fly:status`、`npm run fly:logs`

- 匯入資料（JSON → SQLite）
  - 修正後腳本支援 `POINTLAB_DB_PATH`。在 Fly 機器執行：
    - `flyctl ssh console -C 'sh -lc "cd /app && POINTLAB_DB_PATH=/app/data/pointlab.db node server/scripts/migrate-from-json.js"'`
  - 驗證：`curl "https://pointlab-api.fly.dev/api/topics?page=1&size=5"`

- 常見問題
  - 線上新增 405：通常是 fetch 未走 `withBase()`，已在程式統一修正。
  - 線上無資料：確認 DB 路徑為 `/app/data/pointlab.db`，必要時重跑匯入腳本；或將 `/app/server/pointlab.db` 複製到 `/app/data/pointlab.db` 後重啟。

## 前端 UI 規範（評論/投票）

- Icon 規則：
  - 採主色 `var(--mui-palette-primary-main, #4f46e5)`；hover/active 使用 `var(--mui-palette-primary-dark, #4338ca)`。
  - 不得出現 hover 背景（`backgroundColor: transparent`）。
  - 選中使用 `weight="fill"`，未選 `weight="regular"`。
- 投票三態（允許負數）：未投/讚/倒讚；本地以 localStorage 紀錄（topic: `pl:tv:<id>`、point: `pl:pv:<id>`、comment: `pl:cv:<id>`）。
- 評論輸入：預設單行，自動增高（max 6）；送出按鈕固定圓形 40×40。
- 長文截斷：預設 3 行；顯示「See more/查看更多」與「See less/查看更少」。
- 回覆行為：送出二級留言後，自動展開該父留言並把新留言插在頂部。
- 登入體驗：`GoogleLoginButton` 會先顯示貼齊頁頂的 `LinearProgress` 並 disable 按鈕；登入前會把目前 `pathname+search+hash` 存進 `sessionStorage.pl:back_after_login`，`/auth/callback` 成功後移除並導回原頁。
- 表單 loading 規範：
  - `/points/add`、`/topics/add` 送出時顯示貼頂 `LinearProgress` 並鎖定所有輸入；CTA 內改用 `react-spinners/ClipLoader`。
  - 新增觀點頁：若帶入的主題 `count` 為 0，TopicCard 下方顯示「這個主題空空如也，為主題添加第一個觀點吧！」提醒用戶。
  - 新增主題頁：發布成功後直接導向 `/points/add?topic=<id>`，頁面不再停留且無額外 CTA。
- 新增觀點頁 TopicCard 是主題選擇器：點擊卡片會開 Dialog 顯示所有主題（含搜尋、分隔線），選擇後同步 `?topic=<id>`，清除則移除參數。未選主題時不得發布，也不再提供「使用訪客身份」切換；訪客名稱輸入與 localStorage 同步。

## 首頁 / 列表 / Footer 規範
- Hero
  - 標題固定為「用 PointLab 匯聚好觀點」，僅「好觀點」跳色（`hero.titleHighlight`）；不再換行成兩段。
  - 副標使用 16px，照字典內五行文案渲染，每行為一個 `<span>`；僅「好觀點清單」加粗。
  - 標題上方需有「開源智慧」「沉澱觀點」兩個 Tag（字級 14px、左側 ✦ icon），並保留 1rem 間距。
  - CTA 只保留主按鈕「開始探索」，右側固定 caret-right icon，點擊前往主題箱；CTA 與 HeroStats 距離維持 32px 以內。
- HeroStats
  - 使用 `/api/stats/overview` 的 topics/points/visits 三個指標（comments 暫不顯示）。
  - 每個數字 30px、採主色跳色；以縱向排版（數字在上、文案在下），指標之間用垂直分隔線。
  - 採 `react-countup` 動畫，頁面載入時才開始跑數字。
- 首頁觀點列表
  - 外層不再包卡片背景，直接顯示「觀點列表」標題＋ SortTabs。
  - 卡片整體可點進對應主題詳頁，底部 CTA 使用 `PrimaryCtaButton` + caret-right，置中且與列表有足夠間距。
  - 到達列表終點顯示「這裡是思維的邊界」，Loading/錯誤文字置中。
  - CTA 之後緊接 HeroStats，不需再加入 Product Hunt 標章或外部 Logo。
- 無限捲動
  - 首頁觀點列表、主題箱 `/topics`、主題詳頁 `/topics/:id`、會員中心 `/users/:id` 全採 IntersectionObserver；僅在 sentinel 進入視窗時才抓下一頁，避免初次渲染就連續發請求。
  - 各頁面需提供骨架或 loading 文案，結尾統一用 `common.noMore`（這裡是思維的邊界）。
- Footer
  - 最大寬 576px，位於主內容下方（首頁、主題箱、主題詳頁都要顯示）；與上一區塊保留 32px 以上間距。
  - 「探索」底下僅列垂直連結，順序：首頁 → 主題箱（登入時再顯示會員中心）。「參與」列出新增主題、新增觀點、指南（垂直排列）。關於段落為單行句：「PointLab 的目標，是搜集好觀點。讓觀點可以被分享、辯論、票選、沉澱。」
  - 會員登入後 Footer 的「會員中心」才可見；未登入僅顯示主題箱。
- 會員中心
  - 最上方 PageHeader 僅顯示返回按鈕，不顯示「會員中心」字樣；描述底下不畫分隔線。
  - 里程碑（評論/觀點/主題）順序固定為「評論 → 觀點 → 主題」，即便訪客模式也不隱藏；點擊提示文案會導向對應頁（評論→/topics、觀點→/points/add、主題→/topics/add）。
  - 列表底部與空態 CTA 皆為「新增觀點」，右側 caret-right；底部無論是否有資料都要顯示 CTA。
- 主題詳頁／主題箱下方也需附上 Footer，避免頁面突然結束。

## 工作流程（建議）

1) 開發：遵循單行 commit 規範（≤72 字元），詳細內容寫入 `CHANGELOG.md`。
2) 本地驗證：`npm run build`；評論對話框（桌面/行動）、投票三態、i18n 切換。
3) 部署：
   - 前端：推到 `master` 觸發 Pages
   - 後端：`npm run fly:deploy`（先後端、再前端，避免 API 404）
4) 檢查清單：
   - Pages `VITE_API_BASE` 指向 `https://pointlab-api.fly.dev`
   - Fly `ALLOWED_ORIGINS` 包含 Pages 網域
   - `GET /api/points/:id/comments` 正常、POST/投票無 404
