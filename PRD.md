# PointLab 產品需求（PRD）

本文件彙整目前討論的產品方向與變更需求，供開發與後續協作參考。

## 目標
- 以 React + TypeScript + Vite + MUI 建置「PointLab」。
- 功能與 UI 參考 50hacks.co，品牌為「PointLab」。
- 多語系：繁/簡/英（預設繁體），單一按鈕循環切換；UI 文案在 i18n 範圍，使用者內容不翻譯。

## 範圍（Scope）
- 主題箱（/topics）：主題列表 + SortTabs（最新/熱門/最早）、TopicCard（讚/倒讚/數量/時間/刪除）
- 主題詳頁（/topics/:id）：PageHeader、SortTabs、PointCard 列表；對立模式左右分欄（讚同/其他）
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

## 語言（i18n）
- 支援 zh-Hant / zh-Hans / en；單一按鈕循環切換（繁→簡→英）
- UI 文案覆蓋 header/menu、tabs、actions、topics/points、guide 等；使用者內容不翻譯
- 使用 localStorage 記錄選擇

## 技術棧
- 前端：React + TypeScript + Vite + MUI + Phosphor Icons
- 後端：Express（JSON 檔），Vite dev 代理 `/api`
- i18n：opencc-js（繁→簡轉換）+ 自建字典

## 目前狀態（摘要）
- 已完成：主題/觀點 CRUD（新增/刪除）、排序 tabs、對立模式（position）、i18n、Header/Drawer、指南頁、刪除確認通用元件與 hook、列表穩定刷新
- 進行中/待辦：全面 Hack→Point 檔名類型清理（已啟動，改用 points.json）、無限捲動 hook 統一、更多驗證與錯誤提示優化

## 驗收標準（Acceptance Criteria）
- /topics 可載入並依 tabs 排序；刪除主題會二次確認且刪除後列表自動刷新
- /topics/:id 可載入主題資訊與觀點列表；對立模式左右分欄、卡片著色；刪除觀點會即時移除
- /topics/add 發布成功 Snackbar 並鎖定表單，顯示「新增觀點」引導；未輸入名稱不可發布
- /points/add?topic=… 已載入主題標題/描述；對立模式需選擇立場（未選不可發布）
- 多語系切換即時生效（含新文案）；使用者文字維持原文
- `npm run dev:all` 可同時啟動前後端；後端程式修改會自動重啟

## 待確認（Open Questions）
- Hack→Point 全面改名的時程（已開始，剩餘檔名與型別清理）
- 是否恢復無限捲動（分頁載入）
- 是否保留 slug 相容或加入 301 轉址

## 後續計畫（Next Steps）
1. 全面 Hack→Point 檔案/型別/樣式命名一致化
2. 統一 usePagedList，恢復穩定的無限捲動（主題/觀點通用）
3. 列表操作的錯誤提示與撤銷（Undo）
4. 如需只保留 id 方案：先維持後端 id/slug 相容，前端只產生 id 連結，觀察後再移除相容或加 301 轉址

## 技術債 / TODO（資料層）
- 目前資料庫使用 JSON 檔（server/data/*.json）
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

## 決策紀錄（Decision Log）
- 本段將持續更新，作為需求與設計決策的單一事實來源（SSOT）。
- 2025-11-04：多語系僅覆蓋網站 UI 文案；使用者內容不翻譯。
- 2025-11-04：Header 不含熱門/最新/Top 50，語言切換改單一按鈕。

（註）後續關於是否導入 Tailwind + DaisyUI、CTA 導向頁面等決策，確定後將記錄於此。
