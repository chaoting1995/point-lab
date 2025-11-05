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
- 讀取：`GET /api/topics/id/:id`（可接受 id 或舊 slug）
- 建立：`POST /api/topics` 參數：`name`、`description?`、`mode`（預設 `open`）
- 投票：`PATCH /api/topics/:id/vote` Body：`{ delta: 1 | -1 }`
- 刪除：`DELETE /api/topics/:id`

Point（觀點）
- 欄位：`id`、`description`、`createdAt`、`author{name,role}`、`topicId?`、`position?`（對立模式下 `agree｜others`）
- 列表：`GET /api/points?topic=<topicId>&page=1&size=30&sort=new|hot|old`
- 建立：`POST /api/points` 參數：`description`、`topicId?`、`authorName?`、`authorType=guest|user`、`position?`
- 刪除：`DELETE /api/points/:id`（會同步將對應 Topic 的 `count - 1`）

注意事項
- 前端路由一律使用 `id`；後端仍容許以舊 `slug` 查找（避免舊連結 404）。
- 對立（duel）模式：新增觀點頁提供「選擇立場」按鈕組（讚同/其他）；詳頁左右分欄顯示兩邊觀點。
- 多語系：UI 文案支援 繁/簡/英；使用者輸入內容不自動翻譯。

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

- `server/`：Express + JSON 資料（topics.json、hacks.json）
- `src/components/`：可重用元件（Header、PageHeader、TopicCard、PointCard、ConfirmDialog…）
- `src/pages/`：頁面（TopicsPage、TopicDetailPage、TopicAddPage、PointAddPage、GuidePage）
- `src/hooks/`：共用邏輯（`useSortTabs`、`usePagedList`、`useConfirmDialog` 等）
- `src/i18n/`：多語系資料與 hook
- `src/utils/text.ts`：公用文字處理（`formatRelativeAgo` 等）

## 常見問題

- 刪除後列表沒更新？已在列表頁於刪除後自動重抓第 1 頁；若後端未重啟請執行 `npm run dev:all`。
- 以 slug 進入詳頁 404？後端已支援 id/slug 兼容；請確認後端為最新版本（自動重啟或重跑）。
