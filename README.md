# point-lab

PointLab 是參考 50hacks.co 打造的觀點實驗網站，使用 React + TypeScript + Vite + MUI 開發；前端支援繁/簡/英文多語系切換，後端用簡單的 Express(JSON 檔) 提供 API。

## 主要功能

- 還原 50 Hacks 風格的頭部導覽、英雄區塊與卡片列表。
- 提供「熱門 / 最新 / Top 50」三種 Tab 檢視方式，卡片內建收藏、分享、複製等互動。
- 內建 50 筆繁體中文資料，透過 OpenCC 動態轉換成簡體中文。
- 採用 Nunito 字體與玻璃質感卡片樣式，呼應原站的視覺氛圍。

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

> 開發時前端以 Vite 代理 `/api` 到 `http://localhost:8787`（見 `vite.config.ts`）。

## Tech Stack / 注意事項

- 前端：React + TypeScript + Vite + MUI + Phosphor Icons
- 後端：Express（JSON 檔作為暫時資料庫），Vite dev 代理 `/api`
- i18n：opencc-js（繁→簡轉換）+ 自建字典；UI 文案支援 繁/簡/英

技術債（資料層）
- 目前資料庫使用 JSON 檔（`server/data/*.json`）
  - 風險：併發寫入衝突、無交易/回滾、檔案毀損、整檔讀寫效能差、多機檔案不同步
  - 短期強化：原子寫入（tmp + rename）、應用層鎖、定期快照、Schema 驗證
  - 升級路線：
    1) SQLite + better-sqlite3（單檔、交易安全）
    2) ORM（Prisma/Drizzle）定義 schema/遷移、把排序/分頁交給 DB
    3) 託管 Postgres（Supabase/Neon/Railway），備份/監控/權限
  - 遷移步驟：匯入 JSON →（可選）雙寫灰度 → 切讀 DB，保留 JSON 只讀備援

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
- 列表：`GET /api/points?topic=<topicId>&page=1&size=30&sort=new|hot|old`
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
- 目前後台/管理 API（需 admin/superadmin）：
    - `GET /api/admin/users?page&size`（用戶列表，含發布數量與讚數彙總；伺服器分頁，回傳 `{ items,total,page,size }`）
    - `PATCH /api/admin/users/:id/role`（變更角色：user|admin|superadmin）
    - `GET /api/admin/reports[?type=topic|point|comment]&page&size`（舉報列表；伺服器分頁，回傳 `{ items,total,page,size }`）
    - `POST /api/reports`（新增舉報：`{ type, targetId, reason? }`）
    - `GET /api/admin/stats`（總覽統計：users/guests/topics/points/comments/reports；活躍：DAU dauUsers/dauGuests/dauTotal、MAU mauUsers/mauGuests/mauTotal）
    - `GET /api/admin/stats/points-28d`（近 28 天每日新增觀點數，回傳 `[{ date: 'YYYY-MM-DD', count: number }]`，已補零天）

資料欄位補充
- 登入狀態下發表的 Topic/Point/Comment 會寫入 `userId`；Topic 另保存 `createdBy`。
- 訪客身份：會建立 `pl:guest:id`，未登入/訪客發布時，後端會記錄 `topics.created_by_guest`、`points.guest_id`、`comments.guest_id`；`/api/admin/stats` 回傳 `guests` 總數。

## 前端互動與樣式調整（近期）

- 舉報流程：Topic/Point/Comment 的「報告」都先彈出「確定舉報？」彈窗，含可選的原因輸入框；確認後送出 `POST /api/reports`（Body: `{ type, targetId, reason? }`）。
- 評論標頭：一級評論顯示「{名稱}・{時間}・報告・回覆」。
- 共享按鈕：移除全站「分享」按鈕與相關文案（提示已改為僅提到複製連結）。
- 操作字重：卡片操作文本按鈕（報告/編輯/刪除 等）在 hover 時會加粗並變主色。
- Avatar 彈窗問候：
  - 超級管理者：三行顯示「尊榮的超級管理者 / {名稱} / 歡迎你！」
  - 管理者：三行顯示「尊榮的網站管理者 / {名稱} / 歡迎你！」
  - 會員：三行顯示「尊榮的會員 / {名稱} / 歡迎你！」
- Admin 首頁卡片導向與 DAU：
  - 用戶數 → `/admin/users`
  - 訪客數 → `/admin/guests`
  - 主題數 / 觀點數 / 評論數 → `/topics`
  - 舉報數 → `/admin/reports`
  - 顯示活躍卡片：
    - DAU（三張卡）：DAU（用戶）/ DAU（訪客）/ DAU（總計）
    - MAU（三張卡）：MAU（用戶）/ MAU（訪客）/ MAU（總計）
- Admin 未授權時顯示「登入卡片」（非彈窗），置中呈現 Google 登入按鈕。
- /admin/reports 切換按鈕：採用共用按鈕樣式（`btn btn-sm`），選取態加上 `btn-primary`。
- Loading 體驗優化：
  - 主題箱（/topics）載入時顯示 Topic 骨架（6 欄位，標題/摘要/資訊列）。
  - 主題詳頁（/topics/:id）載入時顯示 Point 骨架（4 列，含右側投票區位）。
  - 檔案：`src/components/Skeletons.tsx`、`src/pages/TopicsPage.tsx`、`src/pages/TopicDetailPage.tsx`。

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

## 資料庫（SQLite）與資料匯入

- 本專案 Phase 1 已支援 SQLite（better-sqlite3）。若未安裝會自動退回 JSON（server/data/*.json）。
- 建議切換到 SQLite 後執行一次性匯入，將舊 JSON 匯入 pointlab.db：

```
npm run migrate:json
```

- 匯入腳本位置：`server/scripts/migrate-from-json.js`
- 匯入內容：topics.json → topics、points.json → points（會保留 createdAt/score/count/position 等欄位）
- 之後即可僅用 SQLite 提供 API；JSON 可保留為備援快照。

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

若本機的 SQLite 沒有資料，可直接從正式站 API 匯入主題與觀點：

```
POINTLAB_DB_PATH=server/pointlab.db npm run seed:from-prod
```

預設來源：`https://pointlab-api.fly.dev`。若需自訂來源，提供參數：

```
POINTLAB_DB_PATH=server/pointlab.db node server/scripts/seed-from-prod.js https://your-api.example.com
```

執行後本機 `/admin` 的統計與列表會顯示匯入結果。

### JSON fallback 種子（快速補資料）

若開發環境暫時無法載入 SQLite（fallback 到 JSON），可直接把正式站資料寫入 JSON 檔：

```
node server/scripts/seed-json-from-prod.js
```

輸出：`server/data/topics.json`、`server/data/points.json`。之後在 JSON 模式下 `/admin` 也能看到正確數據。

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
