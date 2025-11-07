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

## 2025-11-06
- Hack → Point 命名清理（程式與 UI）。
- 新增 AGENTS.md 與 ARCHITECTURE.md（上手指引與架構概覽）。
- 新增 `.env.production`（Pages 建置時注入 `VITE_API_BASE`）。

## 2025-11-05
- 核心頁面與元件：主題、主題詳情、新增/編輯流程、Header/Drawer。
- 初版 i18n（繁/簡/英）涵蓋站內 UI 文案。
