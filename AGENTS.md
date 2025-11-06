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
- 備註：舊路由 `/api/hacks` 已移除。僅在匯入腳本中保留對舊檔名 hacks.json 的讀取相容。

## 資料層策略
- 優先使用 SQLite（`server/pointlab.db`，better-sqlite3）。不存在時自動退回 JSON 檔（`server/data/*.json`）。
- 一次性匯入：`npm run migrate:json` 將 `topics.json / points.json(相容舊名 hacks.json)` 匯入 SQLite。

## 主要目錄與檔案
- 後端：
  - `server/index.js` – Express API 與 SPA 靜態服務（若存在 `dist/`）。
  - `server/db/repo.js` – 資料庫/JSON 雙實作 repository。
  - `server/scripts/migrate-from-json.js` – 匯入腳本。
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

## 常見陷阱
- CORS：記得設定 `ALLOWED_ORIGINS`；本地開發允許全部。
- Vite 代理：開發時 `/api` 代理到 8787，部署分離需設 `VITE_API_BASE`。
- SQLite/JSON 切換：better-sqlite3 缺失時自動回退；注意 JSON 檔案寫入的原子性（短期內使用者風險接受）。
- 前端命名已統一為 Point，避免與舊 Hack 命名混用。

## TODO / Roadmap（簡版）
- JSON 模式增強：原子寫入（tmp+rename）、簡易鎖、Schema 驗證。
- API 規格文件：提供 `openapi.yaml` 或 `docs/endpoints.md`。
- 資料庫升級：抽象層介面與遷移腳本強化；持續 E2E 驗證。

---
本檔為機器導向說明，指令與行為以此為準；如與 README 衝突，請以最新的代碼與本檔規範為優先。
