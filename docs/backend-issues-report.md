# LINE 登入後端問題盤點報告

透過瀏覽器 (Browser Subagent) 模擬 LINE 登入並進入 Dashboard (`/inventory`) 之後，發現有 **4 個主要的後端 API 問題** 導致前台頻繁噴錯甚至卡住。以下是詳細的錯誤資訊與推測原因：

## 1. 🛑 通知 Token 註冊失敗 (Status: 422 Unprocessable Entity)

- **API 端點**: `POST /api/v2/notifications/token`
- **問題描述**:
  前台在登入後利用 `useFCM` 將拿到的 Token 發送到後端，前台打出正確格式的方法 `{ "fcmToken": "...", "platform": "web" }`，但後端卻回傳 `422`。
- **後端詳細錯誤**: `{"expected":"object","code":"invalid_type","path":["body"],"message":"Invalid input: expected object, received undefined"}`
- **根本原因推斷**:
  傳入的 Request Body 後端無法解析，這可能是因為該 V2 路由沒有掛上 `express.json()` (還是您使用的其他 Body Parser) Middleware，或是 Zod 等資料驗證套件中的 Schema 定義與前端不匹配，導致在讀取 `req.body` 時回傳了 `undefined`。同樣的錯誤也發生在 `DELETE /api/v2/notifications/token` 登出清空 Token 的時候。

## 2. 🛑 庫存群組/分類被拒絕服務 (Status: 401 Unauthorized)

- **API 端點**:
  - `GET /api/v2/groups`
  - `GET /api/v2/notifications`
  - `GET /api/v2/profile`
- **問題描述**:
  LINE 登入跳轉回來後，這些需要身分驗證的 API 都回傳了 401 未授權錯誤。並且因為抓不到 `/api/v2/groups` 的群組資料（回傳空物件 `[]` 或直接 401 拒絕），導致前端的庫存分類畫面一直卡在 `Loading categories...`。
- **根本原因推斷**:
  前台的 V2 網路請求主要是預期把授權放在 **Authorization Header** 或依賴備援的 **HttpOnly Cookie**。LINE 登入時是透過 OAuth Redirect 的形式，所以前端並沒有辦法自己攔截取得 `accessToken`。
  如果後端 V2 APIs 被設定為「嚴格限制只接受 `Bearer <token>` 格式」，就會在瀏覽器嘗試依靠被隱含帶上的 Cookie 去請求 V2 端點時被判定為驗證失敗 (401)。

## 3. 🛑 AI 食譜自動儲存失敗 (Status: 401 Unauthorized)

- **API 端點**: `POST /api/v1/recipes`
- **問題描述**:
  初次登入時前台會嘗試幫使用者做 `seedDefaultRecipes` (自動存入預設的 AI 推薦食譜)，卻因為被 401 擋住而默默失敗。
- **根本原因推斷**:
  一樣是發生身分憑證無法正確被傳遞或解析的問題，V1 和 V2 認證憑證沒有辦法銜接上（例如：登入可能設了某種 Cookie，但此處可能需要傳特定的 `Authorization` Header，或是剛登入成功時 Token 還不夠即時/跨域 Cookie 問題導致發送失敗）。

---

### 💡 建議的後端修復方向

1. 檢查 `/api/v2/notifications` 底下的所有 Router 確保皆能正常解析 JSON body。
2. 檢查 V2 API 的認證中介層 (Authentication Middleware) 是不是能夠相容第三方跳轉登入後，以 `HttpOnly Cookie` 的方式完成驗證（不強迫只檢查 `authorization: Bearer`）。
3. 檢查跨網域配置 (CORS / SameSite) 是否允許前端本地端 (localhost) 從 Vercel 後端正確讀取/帶上第三方登入階段發放的 Cookie。
