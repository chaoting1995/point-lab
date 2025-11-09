# PointLab 後端指南（給前端同學）

> 目標：用一份文檔幫助主要做前端的你，快速掌握 PointLab 後端的核心概念、調試手段與部署流程。

## 1. 架構速覽

- **Server**：`server/index.js`，使用 Express 提供 REST API 以及（在單機部署時）靜態檔案。
- **資料層**：優先使用 SQLite（路徑 `server/pointlab.db` 或環境變數 `POINTLAB_DB_PATH` 指向的 DB）。若 SQLite 無法載入會 fallback 至 `server/data/*.json`。
- **Repository**：`server/db/repo.js` 負責所有資料操作，對外暴露 `repo.*` 方法給 Express routes 使用。
- **前後端互動**：前端透過 `src/api/client.ts` 的 `withBase()` & fetch 包裝呼叫 API；使用者登入後會在 Cookie ＋ Bearer token 之間雙保險。
- **部署**：前端 → Cloudflare Pages；後端 → Fly.io（App: `pointlab-api`、Region: `sin`）。

## 2. 常見資料流（以登入為例）

1. 前端 `GoogleLoginButton` 送使用者到 Google OAuth；成功後跳回 `/auth/callback`，並將 `id_token` POST 到 `/api/auth/login`。
2. 後端驗證 Google token，建立/更新使用者 (`repo.upsertGoogleUser`)，產生 session 並：
   - 寫入 `pl_session` HttpOnly Cookie。
   - 回傳 JSON `{ data: { ..., sessionToken } }`。
3. 前端把 `sessionToken` 存 `localStorage`，之後所有 fetch 都加上 `Authorization: Bearer <token>`；同時仍保留 `credentials: 'include'`，讓 Cookie 機制可用於同域環境。

## 3. 環境變數與設定

| 變數 | 用途 | 預設 | 備註 |
| --- | --- | --- | --- |
| `PORT` | Express 監聽 port | `8787` | Vite dev server 透過 proxy 指向此 port |
| `ALLOWED_ORIGINS` | CORS 白名單 | `*` (開發) | 部署時需含 Pages 網域 |
| `POINTLAB_DB_PATH` | SQLite 路徑 | `server/pointlab.db` | Fly.io 以 `/app/data/pointlab.db` 為主 |
| `VITE_API_BASE` | 前端指定 API Base | 空 | Pages / 本機 build 需設定為 API 網域 |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client | — | 沒設定時登入按鈕會退化為假資料 |

## 4. 資料庫 / JSON 切換

`repo.init()` 會嘗試載入 `better-sqlite3`：

- 成功：所有資料寫入 SQLite；`GET /api/_diag` 會顯示 `sqlite: true, dbPath: <path>`。
- 失敗：自動改寫 JSON（`server/data/topics.json`...）。**注意**：若在 fallback 期間寫入資料，改天 SQLite 回復後會看起來「被還原」，務必留意 log 中的 `[repo] storage=` 追蹤狀態。

### 常用腳本

| 指令 | 說明 |
| --- | --- |
| `npm run migrate:json` | 將 JSON 資料匯入 SQLite（單向）。|
| `POINTLAB_DB_PATH=/app/data/pointlab.db node server/scripts/migrate-from-json.js` | 在 Fly 機器內匯入資料。|
| `npm run recount:comments` | 重新計算評論數（同步更新 SQLite 與 JSON）。|

> ⚠️ 未經使用者明確指示，請勿執行 `seed:from-prod` 或任何會覆蓋正式資料的腳本。

## 5. API 速查

| 類別 | 端點 | 摘要 |
| --- | --- | --- |
| 健診/診斷 | `GET /api/health`、`GET /api/_diag` | 健康檢查與存儲狀態。|
| Topics | `GET /api/topics`、`GET /api/topics/id/:id`、`POST /api/topics`、`PATCH /api/topics/:id`、`.../vote`、`DELETE` | 觀點主題 CRUD 與投票。|
| Points | `GET /api/points`、`GET /api/points/:id`、`POST /api/points`、`PATCH`、`DELETE`、`.../vote` | 觀點卡片。|
| Comments | `GET /api/points/:id/comments`、`POST`、`PATCH /api/comments/:id/vote` | 留言串具備 parent-child 結構。|
| 認證 | `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/me`、`PATCH /api/me` | Google / 密碼登入與個資編輯。|
| Admin | `/api/admin/*` | 讀取統計、舉報、使用者授權、訪客列表等。需要 admin/superadmin 權限。|

## 6. 開發流程（後端）

1. **安裝依賴**：`npm install`。
2. **啟動**：
   - 前後端一起：`npm run dev:all`（concurrently 啟動 Vite + Express）。
   - 只啟動 API：`npm run server`。
3. **調試**：
   - `npm run lint`（若有 ESLint）。
   - `npm run build` 確認 TypeScript/打包無誤。

### 常見偵錯手法

- `GET /api/_diag`：確認目前使用 SQLite 或 JSON、資料筆數與 DB 路徑。
- `flyctl logs` 或 `npm run fly:logs`：查看正式機上的 Express console log。
- `flyctl ssh console -C 'sqlite3 /app/data/pointlab.db "select ..."'`：直接查詢資料庫紀錄。

## 7. 部署

### 前端（Cloudflare Pages）
1. `git push origin master` → 觸發自動建置（`npm run build`，輸出 `dist/`）。
2. Pages 上設定 `VITE_API_BASE=https://pointlab-api.fly.dev`。

### 後端（Fly.io）
1. `npm run fly:deploy`（等同 `flyctl deploy`）。Dockerfile 會執行 `npm ci` → `npm run build` → 複製 `server/` 與 `dist/`。
2. 若需查狀態：`npm run fly:status`、`npm run fly:logs`。
3. Volume 已掛在 `/app/data`；若要離線操作 DB，請使用 `flyctl ssh console -C 'sqlite3 /app/data/pointlab.db'`。

## 8. 常見問題 FAQ

### Q1. 登入後看不到 Session？
- 確認前端是否有將 `sessionToken` 寫入 localStorage，並在 fetch headers 加 `Authorization`。
- 檢查瀏覽器是否封鎖第三方 Cookie；可改用同網域部署或依賴 Bearer token。

### Q2. 資料突然變回舊值？
- 可能是伺服器在 JSON fallback 模式下寫入，再切回 SQLite 時看似「被覆寫」。請檢查 `/api/_diag` 與 log 的 `[repo] storage=` 訊息。

### Q3. iOS/Safari 無法登入？
- 已於 `/api/auth/login` 回傳 `sessionToken` 並在前端帶 Authorization header，可提示使用者清除快取或停用 VPN；若仍無法，可在 Console 找 `AuthCallback` 相關 log。

## 9. 推薦閱讀

- `AGENTS.md`：專案行為守則與規範（本文件的補充）。
- `README.md`：完整開發/部署說明。
- `server/index.js`：Express 路由實作（搜尋 `app.get('/api/...` 了解 API 行為）。

歡迎將此檔案下載或分享給其他前端夥伴。若仍有不清楚的環節，可直接在 issue 或工作項目中提問。
