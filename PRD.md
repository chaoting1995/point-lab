# PointLab 產品需求（PRD）

本文件彙整目前討論的產品方向與變更需求，供開發與後續協作參考。

## 目標
- 以 React + TypeScript + Vite 建置「PointLab」網站。
- 功能與 UI 參考 50hacks.co，品牌名稱改為 PointLab。
- 提供繁體／簡體雙語支援（預設繁體，單鍵切換）。

## 範圍（Scope）
- 首頁（單頁）：
  - Header（品牌、語言切換、CTA）
  - Hero（標題、副標、CTA、徽章／媒體 Logo）
  - Hack Tabs 區塊（熱門／最新／Top 50 內容呈現 — 可保留資料排序與 UI 結構，但 Header 不放導覽連結）
  - Hack Card（投票、分享、複製連結等互動）
  - Footer（探索、參與、關於 PointLab）
- 資料：
  - 站內內建 Top 50 靜態資料（繁體撰寫，執行時轉簡體）。
- 語系：
  - 使用 OpenCC 於前端執行時將繁體轉成簡體。

## 非範圍（Out of scope）
- 真實帳號／登入／後端 API。
- 真實投票／回報／留言（目前僅本地互動）。
- 完全像素級複製 50hacks.co 的每個動畫與第三方嵌入（保留可持續優化）。

## UI/互動需求
- Header：
  - 與頁面上緣、左右貼齊；寬度 100%。
  - 左：品牌名稱「PointLab」。
  - 右：語系切換按鈕（僅單顆按鈕；顯示當前語系「繁／簡」，點擊即切換）。
  - 右：CTA「新增靈感」按鈕。
  - 移除 Header 內的「熱門／最新／Top 50」導覽連結。
- Hero：
  - 參考 50hacks.co 風格；標題、副標、主次 CTA、徽章、媒體 Logo。
- Tabs 區塊：
  - 三種資料視圖：熱門（依 upvotes）、最新（依 createdAt）、Top 50（依 rank）。
  - 點擊卡片上的分享／複製按鈕，支援 Web Share API 或複製連結。
- Hack card：
  - 顯示 rank、作者、描述、hashtag、數據（upvotes/comments/shares）。
  - 本地交互：收藏（upvote）切換，數字即時加減。
- Footer：
  - 探索／參與／關於三欄文案與連結。

## 語言（i18n）
- 預設語系：繁體（zh-Hant）。
- 語系切換：
  - 單一按鈕，顯示當前語系「繁」或「簡」。
  - 按一下立即在前端切換（OpenCC runtime 轉換，無需重整）。
  - 使用 localStorage 記錄使用者選擇。
- 範圍限定：只針對「網站 UI 文案」提供繁／簡切換；使用者新增或投稿的內容不做自動翻譯（維持原文顯示）。

## 技術棧
- React + TypeScript + Vite。
- OpenCC（opencc-js）做繁→簡轉換。
- ESLint 已設定；支援 `npm run lint` 與 `npm run build`。

## 目前狀態
- 已完成：
  - Vite 腳手架、ESLint、基本頁面骨架與樣式。
  - Header 貼齊上邊與左右；移除 nav 連結；Logo 僅顯示「PointLab」。
  - 語言切換改為單一按鈕切換繁／簡。
  - 50 筆（以上）繁體資料，前端動態轉簡體。
  - Lint 與 Build 均可通過。
- 尚待：
  - 視覺與互動更貼近 50hacks.co（可考慮導入 Tailwind + DaisyUI 或進一步調整 CSS）。
  - UI 細節（hover、active、陰影、字級、間距）微調。
  - 決策：是否需要像原站一樣的上傳／投票 API 流程（若需要，需補後端）。

## 驗收標準（Acceptance Criteria）
- 重整後可正常載入，不應空白或報錯。
- Header 貼齊四周，不出現 tagline。
- Header 不包含「熱門／最新／Top 50」連結；右上只有語系切換按鈕與 CTA。
- 點擊語系切換按鈕可於繁／簡之間來回切換，文案即時變化。
- Tabs 正確切換資料來源，Hack 卡片互動可用（本地 upvote／分享／複製）。
- `npm run dev` 能啟動（環境允許時）、`npm run build` 成功產出、`npm run lint` 無錯誤。

## 待確認（Open Questions）
- 是否要全面導入 Tailwind + DaisyUI 以高度還原 50hacks.co？
- CTA「新增靈感」要連到哪裡？是否需要投稿表單或外部連結？
- 後續是否會接上後端（投票、留言、檢舉等）？
- 是否需要多頁（例如 /advertise 或 /new）？

## 後續計畫（Next Steps）
1. 你確認是否導入 Tailwind + DaisyUI（或指定 UI 套件）。
2. 我會依決策重構樣式，對齊卡片、按鈕、徽章、陰影、字級等細節。
3. 視需要補上投稿流程或其他頁面。

---
更新紀錄：
- 2025-11-04：建立初版 PRD，整理需求與既有實作、差距與後續。

## 決策紀錄（Decision Log）
- 本段將持續更新，作為需求與設計決策的單一事實來源（SSOT）。
- 2025-11-04：多語系僅覆蓋網站 UI 文案；使用者內容不翻譯。
- 2025-11-04：Header 不含熱門/最新/Top 50，語言切換改單一按鈕。

（註）後續關於是否導入 Tailwind + DaisyUI、CTA 導向頁面等決策，確定後將記錄於此。
