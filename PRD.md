# PointLab 產品需求（PRD）

本文件彙整目前討論的產品方向與變更需求，供開發與後續協作參考。

## 目標
- 以 React + TypeScript + Vite + MUI 建置「PointLab」。
- 功能與 UI 參考 50hacks.co，品牌為「PointLab」。
- 多語系：繁/簡/英（預設繁體），單一按鈕循環切換；UI 文案在 i18n 範圍，使用者內容不翻譯。

## 範圍（Scope）
- 主題箱（/topics）：主題列表 + SortTabs（最新/熱門/最早）、TopicCard（讚/倒讚/數量/時間/刪除）
- 主題詳頁（/topics/:id）：PageHeader、SortTabs、PointCard 列表；對立模式左右分欄（讚同/其他）
  - 觀點卡片可開啟「評論彈窗」：桌面 Dialog（max-width 576, r=10），行動 Drawer（自下而上）
  - 評論：一級/二級、排序（最舊/最新/熱門）、分頁（每頁 10 筆）、二級展開/收合、投票
  - 留言輸入：預設單行，自動增高（最多 6 行）；送出按鈕固定圓形；訪客名稱首次輸入後寫入 localStorage
  - 長文截斷：預設顯示 3 行，顯示「查看更多/查看更少」
- 新增主題（/topics/add）：MUI 表單；發布成功後鎖定表單，顯示「新增觀點」
- 新增觀點（/points/add?topic=）：MUI 表單；對立模式顯示「選擇立場」（讚同/其他）
- 側欄選單（Drawer）：首頁、主題箱、指南、登入/登出、語系切換
- 指南頁（/guide）：固定文案（三張卡）
- 後端 API（Express + JSON）：topics/points 讀寫、排序、投票、刪除

## 非範圍（Out of scope）
- 真實資料庫與大型權限系統（目前為 JSON 檔）。
- 完全像素級複製原站的所有動畫。

## UI/互動需求（摘錄）
- Header 貼齊外框；品牌連回首頁；右側語系切換、CTA（依情境顯示）與漢堡選單
- PageHeader 標題置中且最大化寬度；subtitle 支援換行；可選返回鈕
- 主題卡片 TopicCard
  - 右側讚/倒讚；下方資訊列：模式 | 觀點數量 | 相對時間 | 刪除
  - 刪除需二次確認（通用 ConfirmDialog + useConfirmDialog hook）
- 觀點卡片 PointCard
  - 內容最多兩行，溢出顯示「查看更多/查看更少」（只在確實溢出時顯示）
  - 對立模式依 position 著色（綠/紅）與左右分欄；資訊列置底；可刪除
- 新增觀點：對立模式顯示「選擇立場」按鈕組（未選不可發布）
- 版面：移除雙層左右 padding（比照主題列表），統一圓角 10px

### 評論規格（Comments Spec）
- 容器與版型
  - 桌面 ≥756px：MUI Dialog（max-width 576px、border-radius 10px）
  - 行動 ＜756px：MUI Drawer（自下而上，約 75vh）
  - 標題不顯示，左側為排序 Select（最舊/最新/熱門），預設最舊
- 列表與分頁
  - 一級列表：`GET /api/points/:id/comments?page&size&sort`；回傳含 `childCount`
  - 二級列表：`GET /api/points/:id/comments?parent=<cid>`（每頁 10 筆，「查看更多評論」載入下一頁）
  - 長文截斷：預設顯示 3 行，行尾提供「See more/查看更多」，展開後顯示「See less/查看更少」
  - 一級留言有「See more」時，與「View n replies」可同時存在（互不影響）
- 回覆行為
  - 點任何一級留言的「回覆」進入回覆模式；輸入區上方顯示「正在回覆 {名稱}・取消」
  - 送出二級留言後：對應父留言保持展開，並把新留言插入列表頂部（避免用戶看不到）
- 投票（全站統一）
  - 三態：未投 / 讚 / 倒讚；允許為負數（例：-1）
  - 前端用 localStorage 記錄（`pl:cv:<commentId>`），切換規則：未投→讚(+1)、未投→倒讚(-1)、讚→倒讚(-2)、倒讚→讚(+2)、再次點同方向取消（讚→未投 -1、倒讚→未投 +1）
  - UI：純 icon（填滿主色），hover/active 僅變深色；無圓形底色
  - 一級與二級按讚區置頂對齊
- 輸入區
  - 多行輸入：預設單行，輸入時自動增高（最多 6 行）
  - 送出按鈕：固定圓形（40x40），icon 為主色填滿；hover/active 僅變深色，不出現底色
  - 訪客名稱：localStorage 無則顯示「訪客名稱」欄位，首次送出後保存名稱並隱藏
- 多語系
  - action 文案：reply/replying/cancel/share/commentPlaceholder/viewRepliesCount/hideReplies 等

## 語言（i18n）
- 支援 zh-Hant / zh-Hans / en；單一按鈕循環切換（繁→簡→英）
- UI 文案覆蓋 header/menu、tabs、actions、topics/points、guide 等；使用者內容不翻譯
- 使用 localStorage 記錄選擇；評論/操作文案包含：reply/replying/cancel/viewRepliesCount/hideReplies/commentPlaceholder/share 等

## 技術棧
- 前端：React + TypeScript + Vite + MUI + Phosphor Icons
- 後端：Express（SQLite 優先，JSON fallback），Vite dev 代理 `/api`
- i18n：opencc-js（繁→簡轉換）+ 自建字典

## 目前狀態（摘要）
- 已完成：主題/觀點 CRUD（新增/刪除）、排序 tabs、對立模式（position）、i18n、Header/Drawer、指南頁、刪除確認通用元件與 hook、列表穩定刷新、評論（列表/分頁/二級回覆/投票/輸入）、Hack→Point 命名統一（移除 hacks.json）
- 進行中/待辦：全面 Hack→Point 檔名類型清理（已啟動，改用 points.json）、無限捲動 hook 統一、更多驗證與錯誤提示優化

## 驗收標準（Acceptance Criteria）
- /topics 可載入並依 tabs 排序；刪除主題會二次確認且刪除後列表自動刷新
- /topics/:id 可載入主題資訊與觀點列表；對立模式左右分欄、卡片著色；刪除觀點會即時移除
  - 觀點卡片開啟評論彈窗；排序/分頁正確；回覆模式送出後自動展開該父留言；長文顯示「See more/See less」
- /topics/add 發布成功 Snackbar 並鎖定表單，顯示「新增觀點」引導；未輸入名稱不可發布
- /points/add?topic=… 已載入主題標題/描述；對立模式需選擇立場（未選不可發布）
- 多語系切換即時生效（含新文案）；使用者文字維持原文
- `npm run dev:all` 可同時啟動前後端；後端程式修改會自動重啟

## 待確認（Open Questions）
- Hack→Point 全面改名的時程（已開始，剩餘檔名與型別清理）
- 是否恢復無限捲動（分頁載入）

## 後續計畫（Next Steps）
1. 全面 Hack→Point 檔案/型別/樣式命名一致化
2. 統一 usePagedList，恢復穩定的無限捲動（主題/觀點通用）
3. 列表操作的錯誤提示與撤銷（Undo）
（已決策）全站只保留 id，slug 不再支援；如需 SEO 固定連結，未來改用 ID-based 永久鏈結策略。

## 技術債 / TODO（資料層）
- 目前資料庫使用 SQLite（better-sqlite3）或 JSON fallback（server/data/*.json）；已移除 hacks.json，相容匯入改用 points.json
  - 風險：
    - 併發寫入衝突、無交易/回滾、檔案毀損風險
    - 效能差（整檔讀寫、無索引）、多機不同步、缺乏權限與審計
  - 短期強化：原子寫入（tmp + rename）、應用層鎖、定期快照、Schema 驗證、拆檔與索引快取
  - 升級路線：
    - Phase 1：SQLite + better-sqlite3（單檔、交易安全），包一層 repository 維持 API 介面不變
    - Phase 2：導入 ORM（Prisma/Drizzle），建立 Topics/Points schema 與遷移；把排序/分頁交給 DB
    - Phase 3：託管 Postgres（Supabase/Neon/Railway），設定備份、監控與權限；移除 JSON 雙寫
  - 遷移步驟：一次性匯入 JSON →（可選）雙寫灰度 → 切讀 DB，保留 JSON 只讀備援一段時間

---
更新紀錄：
- 2025-11-04：初版 PRD
- 2025-11-05：加入主題/觀點 API、對立模式(position)、刪除流程與通用確認彈窗、同時啟動前後端腳本與說明
- 2025-11-07：加入評論（API/前端）、投票行為統一（每項三態：不投/讚/倒讚；允許負數）、移除 hacks.json、部署策略（Pages+Fly）

## 非功能需求（NFR）
- 效能：首屏 TTI 合理（開發期不設硬指標），載入有骨架/提示，網路錯誤提供重試。
- 相容：現代瀏覽器最新兩版；行動裝置按鈕可點區至少 40×40。
- 可存取性：IconButton 需 aria-label；Dialog/Drawer 焦點鎖；鍵盤可關閉（Esc）。
- SEO/分享：主題/觀點頁 meta/OG（後續 PR 增補）。

## 資料與安全
- 內容規範：Report（報告）流程規劃（未實作 API，可採外部表單作 MVP）。
- XSS：使用者文字採純文字呈現（換行轉 <br>），不允許 HTML/Markdown；未來若開放，需加白名單與轉義。
- CORS：生產網域透過 `ALLOWED_ORIGINS` 白名單控制；預覽網域視需要加入。
- 備份：SQLite Volume 依 Fly 的 snapshot 機制，定期導出（後續腳本）。

## API 補強（建議）
- Points 投票：`PATCH /api/points/:id/vote` Body: `{ delta: 1|-1|±2 }`（三態切換導致的累計），資料欄位：points.upvotes；影響熱門排序。
- Report（可選）：`POST /api/comments/:id/report`、`POST /api/points/:id/report`（MVP 可先導向外部表單）。

## i18n key（補充清單）
- actions.reply / replying / cancel / share / commentPlaceholder / viewRepliesCount / hideReplies
- common.counts.comments

## 測試與驗收清單（QA）
- 評論：
  - 一級/二級列表載入；分頁「查看更多評論」。
  - 回覆模式送出後父留言展開，新留言置頂可見。
  - 長文 3 行截斷 + See more/See less；同時存在 View n replies 時並存顯示。
  - 投票三態切換（含負數）：未投→讚、未投→倒讚、讚↔倒讚、取消；localStorage 狀態保留。
- 主題/觀點卡：投票三態與 i18n 顯示（8 則評論 | 報告 | 分享）。
- 裝置：桌面 Dialog 與行動 Drawer 外觀、捲動、關閉（Esc / 點 backdrop）。

## TODO（技術）
- 本地 SQLite 載入問題：開發環境 better-sqlite3 載入失敗導致後端落入 JSON fallback；短期以 `server/scripts/seed-json-from-prod.js` 補資料，後續需修復以與正式站一致。
  - 臨時方案：`node server/scripts/seed-json-from-prod.js` 從正式站同步 topics/points 至 `server/data/*.json`。
  - 修復步驟（預計）：
    1) 觀察啟動日誌（已加入）：`[repo] storage=sqlite|json`。
    2) `npm rebuild better-sqlite3 --unsafe-perm` 或重新安裝；確認 Node/架構一致。
    3) 以 `POINTLAB_DB_PATH=server/pointlab.db node server/index.js` 驗證。
    4) 成功後移除 JSON fallback 種子依賴，確保本地/正式站一致。

## 部署與回滾
- 部署順序：先後端（Fly）→ 前端（Pages），避免前端呼叫尚未上線之 API 造成 404。
- Pages：`VITE_API_BASE` 指向後端；如調整需重新部署。
- Fly：`ALLOWED_ORIGINS` 含 Pages 網域；DB 掛載 `/app/data/pointlab.db`；必要時以舊映像回滾。

## 決策紀錄（Decision Log）
- 本段將持續更新，作為需求與設計決策的單一事實來源（SSOT）。
- 2025-11-04：多語系僅覆蓋網站 UI 文案；使用者內容不翻譯。
- 2025-11-04：Header 不含熱門/最新/Top 50，語言切換改單一按鈕。

（註）後續關於是否導入 Tailwind + DaisyUI、CTA 導向頁面等決策，確定後將記錄於此。
