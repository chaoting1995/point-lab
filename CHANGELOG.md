# 變更紀錄（Changelog）

本檔記錄專案的重要變更與里程碑。

## 2025-11-07
- 新增 Points 投票 API（PATCH /api/points/:id/vote），PointCard 串接，三態 ±2 規則一致。
- 新增「評論」功能（後端 + 前端）：列表、排序、分頁、二級回覆、投票。
- 評論 UI：桌面 Dialog / 行動 Drawer、多行輸入自動增高、長文截斷 + 「查看更多/查看更少」。
- 投票模型統一：三態（未投/讚/倒讚），允許負數；前端以 localStorage 記錄每項的投票狀態。
- TopicCard/PointCard 投票樣式與評論一致（主色填滿 icon、hover/active 狀態）。
- i18n 新增：reply/replying/cancel/share/commentPlaceholder/viewRepliesCount/hideReplies 等鍵。
- 移除舊版 `/api/hacks` 與 `server/data/hacks.json`；匯入腳本僅讀 `points.json`。
- 部署文件補充：前端 Cloudflare Pages、後端 Fly.io（SQLite Volume）。

### 2025-11-07（晚間）
- 前端：評論版型改為兩列（第一列：一級＋按讚；第二列：二級列表 90% 靠右，左側灰線）。
- 前端：投票改為互斥（不能同方向取消）；已選方向按鈕 disabled 但保持主色。
- 前端：顏色全面改用 MUI theme palette；移除自訂色票與字串 CSS 變數用法（CSS 檔保留必要部分）。
- 前端：登入彈窗（max-width 300px、內容置中）；側欄登入改為打開彈窗，再由彈窗觸發 Google 登入。
- 後端：修正投票 delta 聚合，正確處理 ±2；Topic/Point/Comment 投票統一用數值 delta。

### 2025-11-08
- 管理後台統計
  - 新增 DAU/MAU 統計欄位（/api/admin/stats 回傳 dauUsers/dauGuests/dauTotal、mauUsers/mauGuests/mauTotal）。
  - 新增 28 天觀點新增折線圖 API：`GET /api/admin/stats/points-28d`。
  - 前端使用 `@mui/x-charts` 在資訊主頁顯示折線圖；Y 軸從 0 起、加入內邊距，避免 0 貼太高。
  - 調整卡片排列：用戶數/訪客數/舉報數同列；卡片在大螢幕統一寬度（120px）、小螢幕滿版寬度；整體靠左排列。
- 設計與使用性
  - 主題數/觀點數/評論數卡片取消點擊導向。
  - Avatar/Popover 可存取性修正建議（恢復焦點、slotProps 設定方式）。
- Slug 全面移除
  - 後端移除 `GET /api/topics/:slug`；`repo.getTopic` 只接受 id。
  - `createTopic` 不再寫入 slug；新增 SQLite 遷移腳本：`server/scripts/drop-topics-slug.js`。
  - 匯入腳本 `migrate-from-json.js` 同步移除 slug 欄位；文件更新。
  - 前端 TopicDetail 僅使用 id 讀取，移除 slug 回退/轉址。
- 種子與診斷
  - 新增 SQLite 種子：`server/scripts/seed-from-prod.js`（從正式站匯入 topics/points）。
  - 新增 JSON 種子：`server/scripts/seed-json-from-prod.js`（fallback 模式快速補資料）。
  - 新增診斷端點：`GET /api/_diag` 回傳 storage 與筆數（sqlite/json），協助排查。
- Loading 體驗
  - 新增骨架元件：`src/components/Skeletons.tsx`（TopicCardSkeleton/PointCardSkeleton）。
  - 主題箱/主題詳頁載入時顯示 Skeleton，避免畫面跳動與空白。

## 2025-11-06
- Hack → Point 命名清理（程式與 UI）。
- 新增 AGENTS.md 與 ARCHITECTURE.md（上手指引與架構概覽）。
- 新增 `.env.production`（Pages 建置時注入 `VITE_API_BASE`）。

## 2025-11-05
- 核心頁面與元件：主題、主題詳情、新增/編輯流程、Header/Drawer。
- 初版 i18n（繁/簡/英）涵蓋站內 UI 文案。
## 2025-11-07

- Auth/Session
  - 前端 fetch 改為 `credentials: include`；所有 API 經 `withBase()`。
- Avatar 點擊改為 Popover 使用者面板（問候語、會員中心、登出確認）。
  - Avatar 彈窗問候語區分 超級管理者/管理者/會員（三行格式）。
  - 未登入或無權進入 /admin 時，顯示登入卡片（非彈窗）。
  - Admin 首頁統計卡片導向：用戶→/admin/users；主題/觀點/評論→/topics；舉報→/admin/reports。
  - /admin/reports 使用共用按鈕樣式切換（btn btn-sm，選取為 btn-primary）。
  - 前台移除所有「分享」按鈕；操作文字（報告/編輯/刪除）hover 加粗。
  - 舉報流程加入確認彈窗與「原因」輸入框（Topic/Point/Comment 皆適用）。
  - 伺服器分頁：/api/admin/users 與 /api/admin/reports 支援 `page/size`，前端採用 Pagination。
  - Admin 首頁新增「訪客數」統計；時間顯示改為 24h 絕對時間。
  - 訪客身份（guestId）：未登入/訪客發布主題/觀點/評論時，後端記錄 guest 欄位並 upsert guests 表；前端建立 `pl:guest:id`。
- Topics/Points/Comments 建立時，登入狀態會寫入用戶 ID
  - topics.created_by、points.user_id、comments.user_id（SQLite 以 alter 方式補欄位；JSON 同步保存）。
  - GET /api/topics 及 /api/topics/id/:id 回傳 `createdBy` 欄位（若存在）。
  - GET /api/points 及 /api/points/:id 回傳 `userId` 與 `author` 正規化。
  - 新增公開使用者 API：`GET /api/users/:id`。
- 評論面板
  - 加入強制換行，避免長字破版。
  - 以實際高度判斷是否顯示「查看更多」，避免未截斷也顯示按鈕。
