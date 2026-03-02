# Profile API 修正規劃書 (Backend)

此規劃書主要整理在整合與測試前台「個人檔案 (Profile)」、「群組名稱」與「飲食喜好」功能時，所發現的後端 API 可以優化的細節與潛在 Bug 點。

雖目前前端已增加相容性處理以防呆，但為了確保前後端資料口徑一致與型別安全，建議後端進行以下修正。

## 1. `GET /api/v2/profile` 回傳格式問題

### A. LINE 登入註冊者的 `name` 欄位為空

- **現象**：使用者透過 LINE 成功登入（或建立新帳號）後，取得 Profile 時 `name` 欄位可能為空，僅有 `displayName` 有值。這會導致前端若直接取用 `name` 時，在群組或設定頁面中顯示成預設的「使用者」或「Guest」。
- **建議修正**：在透過 LINE 註冊或綁定時，請將 LINE 的 `displayName` 同步存入資料庫的 `name` 欄位，確保 `GET /api/v2/profile` 必定能回傳非空的 `name`。

### B. Gender 型別應為數字 (Number Enum) 而非字串

- **現象**：目前的 Swagger / API Guide 定義性別是數值（0: 不透露, 1: 女...），但實際 API （或測試環境 API）回傳了字串型態的 Enum（如 `"NotSpecified"`）。
- **建議修正**：將 API JSON Response 序列化的行為調整，直接輸出整數 (`0`, `1`, `2`, `3`, `4`) ，而非字串 Enum。

## 2. `PUT /api/v2/profile` 回應包裝不一致

- **現象**：在 `GET` API 通常預期有 `{ data: { ...ProfileData } }` 的外層包裝。如果 `PUT` API 更新成功後，回傳的 JSON 是直接將 `ProfileData` 鋪平在最外層（沒有 `data`），會造成前端共用的 Axios Interceptor 或 Mutation 判斷資料結構時失誤而未能自動更新快取（這導致前端飲食喜好修改後無法即時呈現）。
- **建議修正**：確保 `PUT /api/v2/profile` 回傳的 JSON 結構格式與系統標準一致，例如：
  ```json
  {
    "status": "success",
    "data": {
      "id": "...",
      "name": "...",
      "preferences": ["rich", "dairy-egg-allergy"]
      // ... 其他欄位
    }
  }
  ```

## 3. 測試環境 (Mock / DEV) 登入整合性

- **現象**：自動化測試時發現 `POST /api/v2/auth/login` (Email) 與相關的 `/api/v2/groups` 或 FCM 註冊，經常返回 `401 Unauthorized` 或卡在啟動畫面。
- **建議修正**：請檢查開發環境的跨域 (CORS) 下 HttpOnly Cookie 的 Set-Cookie 是否正常生效；或者評估在開發生態系中提供測試用的固定 Mock Session / Token。
