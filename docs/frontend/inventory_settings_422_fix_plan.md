# 📝 後端修改規劃書：庫存設定 API (`PUT /api/v2/groups/:groupId/inventory/settings`)

## 🚨 問題摘要

前台在呼叫 `PUT` 請求更新庫存設定時，雖然帶有合法的 JSON body，但伺服器仍回傳 `422 Unprocessable Entity`。從錯誤日誌（`Invalid input: expected object, received undefined` at `path: ["body"]`）可判定，該端點所在的 Router 未能正確將 JSON payload 解析並賦予到 `req.body`，導致下方的 Controller / Validator 在讀取時得到 `undefined` 進而觸發拒絕。

## 🔍 錯誤根源推斷

1. **未掛載 JSON Body Parser**：該 V2 Router 或者全域 Router 可能漏忘了掛載 `express.json()` (或其他對應框架的 JSON Parser 中介層)。
2. **Middleware 順序錯誤**：`express.json()` 若掛載於此 Router 定義之後，該路由將永遠無法解析 Body。
3. **路徑衝突或未正確套用**：或許 `app.use(express.json())` 只有條件性地套用到 `/api/v1` 等其他路徑，而漏掉了 `/api/v2` 這段 Namespace。
   _(註：相同的情況也發生在 `POST /api/v2/notifications/token` 上)_

## 🛠️ 對應修改步驟 (Action Items)

### 1. 確認 `express.json()` 的掛載位置與範圍

請至後端進入點（如 `app.ts` 或 `server.ts`）檢查全域 Middleware 的配置，確保 JSON Body Parser 被套用於所有的 `/api` 請求。

```typescript
// 修正範例 (Express.js)
import express from 'express';

const app = express();

// 💡 注意：務必確保這一行在所有的路由註冊之前 (尤其是 V2 Router 之前) 呼叫
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ...其他 Router 註冊...
app.use('/api/v2', v2Router);
```

### 2. 局部 Middleware 補強（如果是分散式路由）

如果您們的專案設計是依照「特定 Router 才做 Body 解析」，請至處理 `PUT /api/v2/groups/:groupId/inventory/settings` 的檔案加入解析層：

```typescript
import express from 'express';
const router = express.Router();

// 確保針對有 Body 的動詞套用了 bodyParser
router.put(
  '/:groupId/inventory/settings',
  express.json(),
  settingsController.updateSettings,
);
```

### 3. 檢查 Zod / Validator 的 Schema 結構

如果 Body Parser 已經加對了，請幫忙複查 Validator 結構。
如果是透過類似以下的寫法來檢查：

```typescript
const updateSettingsSchema = z.object({
  body: z.object({
    /* ...細部設定... */
  }),
  params: z.object({ groupId: z.string() }),
});
```

請確認前端發送的 Content-Type 確實有被後端攔截為 `application/json`（由我們前端檢查確定有送出此 header）。只要 `req.body` 有值，這個 Zod 錯誤就會自動消失。

---

> 這個問題順利解決之後，前台卡住報錯的情況就會排除了！前端的部分我已經將資料對齊至最新版本的 Schema 等候後端連通。
