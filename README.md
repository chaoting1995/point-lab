# point-lab

PointLab 是參考 50hacks.co 打造的效率 Hack 展示網站，使用 React + TypeScript + Vite 開發，並支援繁/簡中文語系切換與自訂資料集（Top 50）。

## 主要功能

- 還原 50 Hacks 風格的頭部導覽、英雄區塊與卡片列表。
- 提供「熱門 / 最新 / Top 50」三種 Tab 檢視方式，卡片內建收藏、分享、複製等互動。
- 內建 50 筆繁體中文資料，透過 OpenCC 動態轉換成簡體中文。
- 採用 Nunito 字體與玻璃質感卡片樣式，呼應原站的視覺氛圍。

## 開發環境

1. 安裝依賴：`npm install`
2. 啟動開發伺服器：`npm run dev`
3. 在瀏覽器開啟 CLI 顯示的本地網址（預設為 `http://localhost:5173/`）

## 其他指令

- `npm run build`：建立正式環境用的靜態檔案。
- `npm run lint`：執行 ESLint 檢查。
- `npm run preview`：預覽 build 後的結果。
- `npm run server`：啟動本地 API 伺服器（JSON 版）。
- `npm run dev:all`：同時啟動前端（Vite）與後端（Express）。

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
