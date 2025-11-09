# point-lab

PointLab 是一個專注於「蒐集、辯論、票選、沉澱好觀點」的實驗網站。前端採 React + TypeScript + Vite + MUI + Tailwind，後端為 Express REST API，資料層以 SQLite 為主、JSON 為備援；UI 文案支援繁 / 簡 / 英。

## 主要功能

- **首頁敘事 + 數據**：Hero 區塊包含「開源智慧 / 沉澱觀點」標籤、標題「用 PointLab 匯聚好觀點」（`好觀點` 跳色）、五行副標，只保留一顆 CTA「開始探索」。HeroStats 串接 `GET /api/stats/overview` 顯示主題 / 觀點 / 造訪人次並使用 `react-countup` 動態數字。
- **主題 / 觀點 / 評論**：Topics 支援 open/duel 模式、投票、刪除；Points 具三態投票（±2）、評論面板（排序/二級留言/投票/自動換行）；所有列表都支援 i18n 文案與 localStorage 投票紀錄。
- **無限捲動與 CTA**：首頁觀點列表、主題箱、主題詳頁、會員中心皆透過 IntersectionObserver 做 infinite scroll，終點文案統一為「這裡是思維的邊界」，列表下方使用 `PrimaryCtaButton`（含 caret-right）。
- **新增流程**：`/topics/add`、`/points/add` 送出時貼頂 `LinearProgress`、CTA 內 `ClipLoader`、表單逐一 disabled；新增主題成功後自動導向 `/points/add?topic=<id>`，新增觀點頁的 TopicCard 變成主題選擇器 Dialog，發布前必須選擇主題。
- **登入與會員中心**：Google 登入按鈕在跳轉前顯示 LinearProgress 並暫存返回路徑；會員中心含里程碑卡（評論→觀點→主題）、個人觀點列表 infinite scroll、底部「新增觀點」CTA，登入後 Footer 才顯示「會員中心」。
- **後台管理**：Admin Users/Reports/Stats 提供角色切換、DAU/MAU、報表；用戶列表新增「全部/會員/訪客」Tab 與刪除動作，刪除後內容標記為無主；還有舉報流程與 28 天觀點曲線。
- **多語系**：全部 UI 文字走 i18n 字典（不可再加 `t('key') || 'fallback'`），繁/簡切換時會透過 opencc-js 轉換使用者輸入。

## 開發環境

1. 安裝依賴：`npm install`
2. 同時啟動前後端（推薦）：`npm run dev:all`
   - 前端：Vite（預設 http://localhost:5174）
   - 後端：Express（http://localhost:8787），已使用 `node --watch` 自動重啟
3. 僅啟前端：`npm run dev`（需自行啟 `npm run server` 或調整 API Base）

## 指令摘要

- `npm run dev`：啟動前端（Vite）
- `npm run server`：啟動後端（Express, auto-reload）
- `npm run dev:all`：同時啟動前後端（推薦）
- `npm run build`：產生正式版靜態檔
- `npm run preview`：預覽 build 結果
- `npm run lint`：執行 ESLint 檢查
- `npm run recount:comments`：重新計算所有觀點的評論數（SQLite 與 JSON fallback 皆會同步）

> 開發時前端以 Vite 代理 `/api` 到 `http://localhost:8787`（見 `vite.config.ts`）。

> ⚠️ 除非使用者在當前指令中明確要求，請勿執行任何會覆蓋本機資料的匯入腳本（`npm run seed:from-prod`、`node server/scripts/seed-json-from-prod.js` 等）。

## Tech Stack / 注意事項

- 前端：React + TypeScript + Vite + MUI + Tailwind + Phosphor Icons；Nunito 為主字體。
- 後端：Express + better-sqlite3，所有 fetch 透過 `withBase()`，在 dev 模式由 Vite 代理 `/api` → `http://localhost:8787`。
- 資料層：SQLite (`server/pointlab.db`) 為預設來源，若無法載入會自動退回 `server/data/*.json`。所有腳本皆支援 `POINTLAB_DB_PATH`，`npm run recount:comments` 可重新統計評論數。⚠️ 未經使用者要求請勿執行任何會覆蓋本地資料的匯入腳本。
- i18n：opencc-js（繁→簡）＋ `src/i18n/translations.ts`；**禁止**再使用 `t('key') || 'fallback'`，缺字需補字典。

技術債（資料層）
- JSON fallback 仍存在併發寫入風險：無交易/回滾、整檔覆寫、不同步。生產環境請設定 `DISABLE_JSON_FALLBACK=1` 直接拒絕 fallback，確保所有寫入一定走 SQLite（Fly `fly.toml` 已預設）。
- 短期：補原子寫入（tmp + rename）、簡易鎖、Schema 驗證、定期快照。
- 長期：持續以 SQLite 為主，必要時導入 ORM（Prisma/Drizzle）與 migraiton，最終遷移到託管 Postgres（Supabase/Neon/Railway）。

## 資料模型與 API

Topic（主題）
- 欄位：`id`、`name`、`description?`、`createdAt`、`score`、`count`、`mode`（`open`｜`duel`）
- 列表：`GET /api/topics?page=1&size=30&sort=new|hot|old`
- 讀取：`GET /api/topics/id/:id`（僅支援 id）
- 建立：`POST /api/topics` 參數：`name`、`description?`、`mode`（預設 `open`）。若用戶已登入，後端會記錄 `created_by=userId`，回傳物件帶 `createdBy`。
- 投票：`PATCH /api/topics/:id/vote` Body：`{ delta: 1 | -1 }`
- 刪除：`DELETE /api/topics/:id`

Point（觀點）
- 欄位：`id`、`description`、`createdAt`、`author{name,role}`、`topicId?`、`userId?`、`position?`（對立模式下 `agree｜others`）
- 列表：`GET /api/points?topic=<topicId>&page=1&size=20&sort=new|hot|old`
- 建立：`POST /api/points` 參數：`description`、`topicId?`、`authorName?`、`authorType=guest|user`、`position?`。若用戶已登入，後端會記錄 `userId`，並覆寫 `authorType='user'` 與作者名稱。
- 投票：`PATCH /api/points/:id/vote` Body：`{ delta: 1 | -1 }`（三態切換會出現 ±2 的累計行為，後端最終以整數 upvotes 儲存並影響熱門排序）
- 刪除：`DELETE /api/points/:id`（會同步將對應 Topic 的 `count - 1`）

Comments（評論）
- 欄位：`id`、`pointId`、`parentId?`、`content`、`author{name,role}`、`upvotes`、`createdAt`
- 一級/二級列表：
  - `GET /api/points/:id/comments?sort=old|new|hot&page=1&size=10`（一級）
  - `GET /api/points/:id/comments?sort=old|new|hot&page=1&size=10&parent=<commentId>`（二級）
 - 回傳一級評論含 `childCount` 供展開提示
- 建立：`POST /api/points/:id/comments` Body：`{ content, parentId?, authorName?, authorType? }`。若用戶已登入，後端會記錄 `userId`，並覆寫為 `authorType='user'`。
- 投票：`PATCH /api/comments/:id/vote` Body：`{ delta: 1 | -1 | ±2 }`（允許負數）

其他 API

- 公開使用者：`GET /api/users/:id` → `{ id, name, picture, bio }`
- 數據概覽：`GET /api/stats/overview` → `{ topics, points, comments, visits }`（visits 為近 30 天造訪總人次）
- 目前後台/管理 API（需 admin/superadmin）：
    - `GET /api/admin/users?page&size`（用戶列表，含發布數量與讚數彙總；伺服器分頁，回傳 `{ items,total,page,size }`）
    - `PATCH /api/admin/users/:id/role`（變更角色：user|admin|superadmin）
    - `DELETE /api/admin/users/:id`（僅 superadmin；刪除後會把該用戶的主題/觀點/評論標記為無主、session 失效）
    - `GET /api/admin/reports[?type=topic|point|comment]&page&size`（舉報列表；伺服器分頁，回傳 `{ items,total,page,size }`）
    - `POST /api/reports`（新增舉報：`{ type, targetId, reason? }`）
    - `GET /api/admin/stats`（總覽統計：users/guests/topics/points/comments/reports；活躍：DAU dauUsers/dauGuests/dauTotal、MAU mauUsers/mauGuests/mauTotal）
    - `GET /api/admin/stats/points-28d`（近 28 天每日新增觀點數，回傳 `[{ date: 'YYYY-MM-DD', count: number }]`，已補零天）

資料欄位補充
- 登入狀態下發表的 Topic/Point/Comment 會寫入 `userId`；Topic 另保存 `createdBy`。
- 訪客身份：會建立 `pl:guest:id`，未登入/訪客發布時，後端會記錄 `topics.created_by_guest`、`points.guest_id`、`comments.guest_id`；`/api/admin/stats` 回傳 `guests` 總數。

## 前端互動與樣式指引

### Hero / 首頁
- 標題固定為「用 PointLab 匯聚好觀點」，僅「好觀點」跳色；上方必須顯示「開源智慧」「沉澱觀點」兩個 14px tag（含 icon）。
- 副標 16px，依 `translations.hero.subtitle` 的換行符號切成 5 行，僅「好觀點清單」加粗。
- CTA 只保留一顆「開始探索」按鈕（含 caret-right），點擊導向 `/topics`；Hero 與 CTA 與 HeroStats 間距 32px 以內。
- HeroStats 呼叫 `GET /api/stats/overview` 顯示 topics / points / visits，採主色數字 + 垂直分隔線，搭配 `react-countup`。

### 列表 / Infinite Scroll
- 首頁觀點列表外層移除卡片框，新增標題「觀點列表」。卡片可以點擊進入對應主題詳頁。
- 觀點/主題/會員中心列表皆採 IntersectionObserver infinite scroll；初始僅抓一頁，進入 sentinel 才載入下一頁。Loading/錯誤訊息置中，終點統一顯示「這裡是思維的邊界」。
- 列表底部 CTA 使用 `PrimaryCtaButton` + caret-right，置中且保留上下間距；首頁為「前往主題箱」，會員中心為「新增觀點」。

### 表單 / 登入
- Google 登入按鈕在打開 Google 之前顯示貼頂 `LinearProgress`，並將 `pathname+search+hash` 存到 `sessionStorage.pl:back_after_login`；`/auth/callback` 成功後導回原頁。為避免 Safari/iOS 阻擋第三方 Cookie，後端登入 API 會在 JSON 內附帶 `sessionToken`，前端會存入 `localStorage`，並於後續 API 請求加上 `Authorization: Bearer <token>` 作為備援。
- `/topics/add`、`/points/add` 提交期間顯示貼頂 `LinearProgress`、CTA 內 `ClipLoader`，欄位逐一 disabled 並降低透明度；錯誤時顯示 Alert。
- 新增主題成功後直接導向 `/points/add?topic=<id>`，不再留下成功視窗。
- 新增觀點頁的 TopicCard 行為：
  - 預設顯示「選擇主題」，點擊後開啟 Dialog（含搜尋、列表分隔線）。選擇後同步 URL `?topic=<id>`，清除則移除該參數。
  - 未選主題無法發布；若主題 `count` 為 0 顯示「這個主題空空如也，為主題添加第一個觀點吧！」。
  - 移除「使用訪客身份」按鈕；訪客名稱直接顯示欄位並與 localStorage 同步，成功發布後更新 localStorage。

### Footer / 導覽
- Footer 最大寬 576px，垂直排列：探索（首頁 → 主題箱 → 登入後才顯示會員中心）、參與（新增主題 / 新增觀點 / 指南）、關於（單行目標敘述）。登入前僅顯示首頁 / 主題箱。
- Footer 需出現在首頁、主題箱、主題詳頁底部；與上一段落保持 ≥32px 間距。
- Header 與 `<title>`/favicon 均指向 `public/logo.svg`，品牌點擊回首頁。

### 會員中心
- PageHeader 僅留返回鈕；描述下方不再畫分隔線。
- 里程碑順序：評論 → 觀點 → 主題；即便訪客視角也要顯示。每個 ListItemButton 會導向 `/topics`、`/points/add`、`/topics/add`。
- 列表及空態 CTA 統一為「新增觀點」，列表底部無論是否有資料都保留 CTA。

### 舉報 / Admin
- Topic/Point/Comment 的「報告」都先彈出確認 Dialog（含原因輸入框），確認才送 `POST /api/reports`。
- Admin Users 新增「全部 / 會員 / 訪客」Tab，Tab 之間要有間距；列表新增「操作」欄，提供刪除按鈕與確認彈窗（刪除後內容標記為無主，session 失效）。
- Admin 首頁卡片導向：用戶/訪客 → `/admin/users` (Tab 過濾)；主題/觀點/評論 → `/topics`；舉報 → `/admin/reports`；DAU/MAU 卡維持用戶/訪客/總計排列。

## 評論功能（前端互動規格）

- 容器與版型
  - 桌面（≥756px）：MUI Dialog（max-width 576px、圓角 10px）
  - 行動（<756px）：MUI Drawer 自下而上（約 75vh）
  - 左側排序 Select：最舊/最新/熱門（預設最舊），不顯示標題文字
- 列表與分頁
  - 一級列表使用上方 API；二級列表帶 `parent=<commentId>`；每頁 10 筆
  - 一級回傳含 `childCount`，顯示「View {n} replies / 查看 {n} 則回覆」按鈕
  - 長文預設顯示 3 行，行尾提供「See more/查看更多」，展開後改為「See less/查看更少」
  - 一級留言同時存在「See more」與「View n replies」時兩者並存
- 回覆行為
  - 點「回覆」進入回覆模式，輸入區上方顯示「正在回覆 {名稱}・取消」
  - 送出二級留言後自動展開父留言，並把新留言插入最上方，避免使用者看不到
- 投票（三態且允許負數）
  - 狀態：未投 / 讚 / 倒讚；切換規則依 delta 調整（未投→讚 +1、未投→倒讚 -1、讚→倒讚 -2、倒讚→讚 +2、再次點同方向取消）
  - 前端以 localStorage 記錄（`pl:cv:<commentId>`）；icon 採主色填滿，hover/active 僅變深色；按讚區置頂
- 輸入區
  - 多行輸入：預設單行，輸入時自動增高（最多 6 行）
  - 送出按鈕：固定圓形（40x40）；icon 為主色填滿；hover/active 不出現底色
  - 訪客名稱：localStorage 無則顯示「訪客名稱」欄位，首次送出後保存名稱
  - 超長單行自動換行（`word-break: break-word; overflow-wrap: anywhere`）；僅在實際被三行截斷時顯示「查看更多」。

注意事項
- 前端與後端一律使用 `id`；不再支援 `slug`。
- 對立（duel）模式：新增觀點頁提供「選擇立場」按鈕組（讚同/其他）；詳頁左右分欄顯示兩邊觀點。
- 多語系：UI 文案支援 繁/簡/英；使用者輸入內容不自動翻譯。
- Google 登入：點擊登入按鈕時會顯示貼頂 `LinearProgress` 並 disable 按鈕，登入前會把目前 URL 儲存到 `sessionStorage.pl:back_after_login`，`/auth/callback` 成功後會導回原頁；為避免裝置封鎖第三方 Cookie，登入 API 會額外回傳 `sessionToken`，前端會寫入 `localStorage` 並在所有 API 請求加上 `Authorization: Bearer <token>` 做備援。
- 新增主題/觀點：送出期間顯示貼頂 `LinearProgress`、CTA 內使用 `ClipLoader`，同時鎖定所有表單；新增主題成功後立即跳轉到 `/points/add?topic=<id>`，新增觀點頁若主題觀點數為 0 會顯示「這個主題空空如也...」提示。

## 部署建議

單機一體（最快）
- `npm run build` 產生 `dist/`
- 啟動後端：`npm run server`（Express 會自動服務 `dist/` 並作 SPA fallback）
- 建議用 Nginx/Caddy 反向代理 80/443 到 Node 服務並簽發 SSL

前後端分離（通用，推薦：Cloudflare Pages + Fly.io）
- 前端部署到 Cloudflare Pages（或 Netlify/Vercel），建置命令 `npm run build`，輸出 `dist`
- 後端部署到 Fly.io，設定 `PORT=8787`，並掛載 Volume 保存 `/app/server/pointlab.db`
- 前端 `.env.production` 設 `VITE_API_BASE=https://api.pointlab.com`
- 後端 CORS 透過 `ALLOWED_ORIGINS` 控制，例：`https://pointlab.com,https://www.pointlab.com`
- `src/api/client.ts` 已支援 `VITE_API_BASE`，生產環境會自動改用完整 API Base

Cloudflare Pages（前端）
- Build command: `npm run build`；Build output: `dist`
- 環境變數：`VITE_API_BASE=https://api.pointlab.com`
- 綁定網域 `pointlab.com`（或子網域）到 Pages 專案

Fly.io（後端）
- 準備：安裝 `flyctl`，`flyctl auth login`
- 建 app：`flyctl launch`（或修改 `fly.toml` 的 `app` 與 `primary_region`）
- 建 Volume：`flyctl volumes create data --size 1 --region <你的區域>`
- 部署：`flyctl deploy`
- 設環境變數：`flyctl secrets set ALLOWED_ORIGINS="https://pointlab.com,https://www.pointlab.com"`
- 健檢：`curl https://api.pointlab.com/api/health`

## SEO 與搜尋引擎設定

- Head metadata：`index.html` 已設定 `lang="zh-Hant"`、canonical、描述、OG/Twitter 標籤與 `WebSite` JSON-LD，部署時請維持標題/描述同步最新文案。
- Robots 與 Sitemap：預設提供 `public/robots.txt` 與 `public/sitemap.xml`，部署後可由 `https://point-lab.pages.dev/robots.txt` 與 `/sitemap.xml` 取得。若新增主要頁面請記得更新 sitemap。
- Google Search Console：
  1. 於 [GSC](https://search.google.com/search-console) 建立 `網址前置字串` 資產（例：`https://point-lab.pages.dev/`）。
  2. 驗證方式建議使用 HTML 檔案：將 Google 提供的 `googleXXXX.html` 放進 `public/`（目前使用 `public/googled6b3c7e411c63b61.html`），部署後即可驗證。
  3. 在 GSC 的「Sitemaps」提交 `https://point-lab.pages.dev/sitemap.xml`，並視需要對新頁面使用「網址檢查 → 請求建立索引」。
  4. 若後續改網域或新增語言版本，請重新調整 canonical、sitemap 與驗證檔。

## 資料庫（SQLite）與資料匯入

- 本專案 Phase 1 已支援 SQLite（better-sqlite3）。若未安裝會自動退回 JSON（server/data/*.json）；**正式站務必設定 `DISABLE_JSON_FALLBACK=1`**，讓 SQLite 無法啟動時直接失敗，而不是把資料寫到 JSON。
- 建議切換到 SQLite 後執行一次性匯入，將舊 JSON 匯入 pointlab.db：

```
npm run migrate:json
```

- 匯入腳本位置：`server/scripts/migrate-from-json.js`
- 匯入內容：topics.json → topics、points.json → points（會保留 createdAt/score/count/position 等欄位）
- 之後即可僅用 SQLite 提供 API；JSON 可保留為備援快照（或在生產環境直接刪除 `server/data/*.json` 以避免誤用）。

### SQLite 遷移：移除 topics.slug 欄位

專案已全面改用 `id`，不再使用 `slug`。若你的 SQLite 既有資料表包含 `slug` 欄位，可執行一次性遷移移除該欄位：

```
POINTLAB_DB_PATH=/path/to/pointlab.db npm run migrate:drop-slug
```

在 Fly 機器上可執行：

```
flyctl ssh console -C 'sh -lc "cd /app && POINTLAB_DB_PATH=/app/data/pointlab.db node server/scripts/drop-topics-slug.js"'
```

成功訊息會顯示：`[migrate] topics.slug dropped successfully.`

### 從正式站匯入資料到本機（種子）

若本機的 SQLite 沒有資料，可直接從正式站 API 匯入主題、觀點與評論：

```
POINTLAB_DB_PATH=server/pointlab.db npm run seed:from-prod
```

預設來源：`https://pointlab-api.fly.dev`。若需自訂來源，提供參數：

```
POINTLAB_DB_PATH=server/pointlab.db node server/scripts/seed-from-prod.js https://your-api.example.com
```

執行後本機 `/admin` 的統計與列表會顯示匯入結果。

> ⚠️ 此腳本會覆蓋本機 SQLite／JSON 資料，僅在使用者於當前工作中明確要求時才能執行。

### JSON fallback 種子（快速補資料）

若開發環境暫時無法載入 SQLite（fallback 到 JSON），可直接把正式站資料寫入 JSON 檔：

```
node server/scripts/seed-json-from-prod.js
```

輸出：`server/data/topics.json`、`server/data/points.json`、`server/data/comments.json`。之後在 JSON 模式下 `/admin` 也能看到正確數據。

> ⚠️ 同樣僅能在使用者明確要求覆蓋資料時執行此腳本。

### 重新計算評論數

若你在本地刪除主題/觀點或重新匯入資料後，發現觀點卡片上的「評論數」與實際留言不一致，可執行：

```
npm run recount:comments
```

此腳本會同時更新 SQLite `points.comments` 欄位與 JSON fallback (`server/data/points.json`)，讓前台顯示的評論數維持正確。

### 診斷端點（資料層）

開發時可檢查目前後端使用的儲存層與筆數：

```
GET /api/_diag
→ { data: { sqlite: true|false, dbPath, topicsDb, pointsDb, topicsJson, pointsJson } }
```

## Google 登入設定（可選，建議開啟）

若要啟用真實的 Google 第三方登入：

1. 申請 OAuth 用戶端
   - 前往 Google Cloud Console → APIs & Services → Credentials
   - 建立 OAuth 2.0 Client ID，應用程式類型選「Web application」
   - 在 Authorized JavaScript origins 加入你的開發網址：`http://localhost:5174`
   - 在 Authorized redirect URIs 可留空（Google Identity Services 不需要 redirect）
   - 取得「Web client ID」

2. 在專案根目錄建立 `.env`（可參考 `.env.example`）

```
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID
```

3. 重新啟動開發伺服器：

```
npm run dev:all
```

沒有設定 `VITE_GOOGLE_CLIENT_ID` 時，點「登入」會進入示範登入狀態（方便測試 UI 流程）。

## 專案結構（節錄）

- `server/`：Express + JSON 資料（topics.json、points.json）
- `src/components/`：可重用元件（Header、PageHeader、TopicCard、PointCard、ConfirmDialog…）
- `src/pages/`：頁面（TopicsPage、TopicDetailPage、TopicAddPage、PointAddPage、GuidePage）
- `src/hooks/`：共用邏輯（`useSortTabs`、`usePagedList`、`useConfirmDialog` 等）
- `src/i18n/`：多語系資料與 hook
- `src/utils/text.ts`：公用文字處理（`formatRelativeAgo` 等）

## 常見問題

- 刪除後列表沒更新？已在列表頁於刪除後自動重抓第 1 頁；若後端未重啟請執行 `npm run dev:all`。
- 以 slug 進入詳頁將無法使用，請改用 `/topics/:id`。
