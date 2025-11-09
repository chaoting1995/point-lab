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

## 2025-11-09
- 後台舉報列表新增「狀態」欄位，可直接在表格中以下拉切換「未解決/已解決」，同步更新 `/api/admin/reports/:id/status`；後端 `reports` 表新增 `status` 欄位並回傳此資訊。
- 後端：`repo.deleteTopic` 在 JSON fallback 中會同步刪除隸屬觀點與其評論，避免殘留孤兒資料。
- 後端：`repo.getStats` 對每張表的 count 查詢加入安全降級，缺表/欄位時不再整體歸零，`/api/stats/overview` 能正確回傳正式站數據。
- 前端：會員中心將「編輯個人資料」按鈕移至「訪客視角」下方，保持按鈕階層清楚。
- 前端：新增觀點頁把「這個主題空空如也…」提示移到「點擊更換主題」文案下方，避免卡片內跑版。
- SEO：`index.html` 新增結構化資料、Meta/OG/Twitter 標籤與中文語系設定；補上 `public/robots.txt` 與 `public/sitemap.xml`，提升搜尋引擎收錄品質。
- 登入流 UX：Google 登入按鈕點擊時顯示貼頂 `LinearProgress` 並 disable；登入前把 `pathname+search+hash` 寫入 `sessionStorage.pl:back_after_login`，`/auth/callback` 成功後移除並導回原頁。
- 新增主題/觀點頁：送出期間顯示貼頂 `LinearProgress` 與 CTA 內 `ClipLoader`，鎖定所有欄位；新增主題成功後直接導向 `/points/add?topic=<id>`，新增觀點頁若主題觀點數為 0 會顯示提示文案。
- 首頁 CTA：觀點列表下方的「前往主題箱」採用 `PrimaryCtaButton` + caret-right icon，置中並與列表拉開間距。
- 新增資料維護腳本 `npm run recount:comments`，可在匯入後重新計算觀點的評論數（同步支援 SQLite 與 JSON fallback）。
- 首頁體驗
  - Hero 改版：移除卡片背景，新增「開源智慧／沉澱觀點」標籤（含 icon）、標題「用 PointLab 匯聚好觀點」並以 `hero.titleHighlight` 讓「好觀點」跳色；副標支援多行、僅「好觀點清單」加粗。
  - CTA 僅保留單一主按鈕「開始探索」＋ caret-right；Hero 與 CTA 與數據區距離、padding 依新稿調整，`header` 與 `<title>` 使用 `public/logo.svg`。
  - 新增 HeroStats：載入 `/api/stats/overview` 的 topics/points/visits，使用 `react-countup` 動態跳動並以主色數字＋豎線分隔。
  - 首頁觀點列表移除外層卡片、加上「觀點列表」標題，卡片可點擊帶往對應主題詳頁；列表底部 CTA 與 Hero CTA 同型。
  - 空狀態／終點文案改為「這裡是思維的邊界」，`common.noMore` 同步更新。
- 無限捲動與載入提示
  - 首頁觀點列表、主題箱 `/topics`、主題詳頁 `/topics/:id`、會員中心 `/users/:id` 皆改為 IntersectionObserver 無限捲動；骨架載入 + 「這裡是思維的邊界」終點提示一致。
  - 移除首頁初次載入即請求第 2 頁的行為，僅在捲到底時才抓下一頁；新增 loading/錯誤文字。
  - Member Center 列表底部與空態 CTA 改為「新增觀點」。
- 新增觀點 / 主題流程
  - `/points/add` 的 TopicCard 變成主題選擇器（維持卡片外觀）；點擊開啟 Dialog，支援搜尋、點擊套用、清除，並自動同步 `?topic=` 查詢參數。
  - 移除「使用訪客身份」切換；若為訪客一律顯示名稱欄位並沿用 localStorage 的暱稱；提交時依實際名稱更新 localStorage。
  - 發布時的 CTA spinner 改採 `react-spinners/ClipLoader`；提交完成依主題帶回 `/topics/:topicId`，若主題觀點數為 0 於卡片底下顯示「這個主題空空如也…」提示。
  - 新增主題成功後直接導向 `/points/add?topic=<id>`，跳過原本的成功提示區塊。
- Footer 與導覽
  - Footer 最大寬 576px，探索/參與/關於鏈結改成縱向排列並採新版文案；「會員中心」僅在登入時顯示，未登入只露出「主題箱」。
  - Footer 追加到主題箱與主題詳頁底部，與上一區塊保有間距。
  - 首頁觀點列表下方新增「前往主題箱」CTA，樣式與「新增觀點」一致並置中；會員中心底部 CTA 亦採相同元件。
  - 探索連結新增「首頁」並放在最上方，後續依序為「主題箱」「會員中心（登入時）」。
- 後台用戶管理
  - 用戶列表新增「全部 / 會員 / 訪客」三個 Tab 並拉開間距；列表欄位新增「操作」，提供刪除按鈕。
  - 刪除按鈕點擊會跳出確認彈窗（「確定刪除此用戶？」＋「用戶的內容將標記為無主，無法復原。」），確認後呼叫 `DELETE /api/admin/users/:id`，資料立即從列表移除，後端也會把該用戶的內容標記為「無主」。
  - 發布數量欄位強制不換行，角色切換選單字級調整，訪客資料與會員資料整併於同一表。

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
