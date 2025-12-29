# AI 影像辨識與庫存管理 Prompt 優化指南

本文件定義 AI 在執行「冰箱食材辨識」與「食譜消耗計算」時的標準邏輯。請嚴格遵守以下分類與過濾規則。

## 一、圖片情境預判 (Image Context Analysis)

在執行物件偵測與分類之前，AI **必須** 先分析圖片的整體情境模式 (Mode Check)。這一步驟是避免將「完成的料理」錯誤拆解為「食材」。

### 判斷邏輯

1.  **單一料理模式 (Cooked Dish Mode)**:

    - **特徵**: 圖片中是一個「已擺盤完成」的料理（如一碗拉麵、一盤義大利麵），通常裝在餐具中，背景可能為餐桌。
    - **AI 行為**:
      - **不要分割**: 不要嘗試分割畫面或裁剪食材（不要把麵裡的蛋、肉分開截圖）。
      - **輸出單一物件**: 辨識為一個整體項目，例如 `type: "dish"`, `name: "牛肉麵"`。
      - **強制分類 (Categorization)**: **必須** 將此料理歸入 7 大嚴格分類之一（依據主食材或屬性）。
        - _範例_: 牛排 -> `meat`
        - _範例_: 義大利麵 -> `bake` (主食)
        - _範例_: 燙青菜 -> `fruit`
        - _範例_: 7-11 微波便當/冷凍食品 -> `frozen`
        - _範例_: 海鮮燉飯 -> `seafood`
      - **後續動作**: 若為消耗流程，則系統再根據菜名查找食譜進行成分扣除。

2.  **食材清單模式 (Grocery/Fridge Mode)**:
    - **特徵**: 圖片中包含「原始食材」、「包裝食品」，散落在桌面、購物袋或是冰箱內部。
    - **AI 行為**:
      - 執行**物件偵測 (Object Detection)**。
      - 分割並裁剪個別食材影像。
      - 針對每個食材執行分類與入庫邏輯（見第二點）。

> **Prompt 指令範例**:
> "First, classify the image type. Is this a `FINISHED_MEAL` or `INGREDIENTS_LIST`?"
> "If `FINISHED_MEAL`: Return ONE item. `name`: dish name, `category`: strict category ID (e.g. 'meat', 'bake'). Do not crop ingredients."
> "If `INGREDIENTS_LIST`: Detect, crop, and classify each item individually."

---

## 二、入庫辨識規範 (Input Recognition)

**適用情境**: 當判定為 **食材清單模式 (Grocery Mode)** 時。

### 1. 忽略清單 (Ignore List - Do Not Track)

以下物品屬於「背景雜訊」或「非核心管理項目」，AI 若偵測到應主動忽略。

- **基礎調味料**: 醬油、醋、油 (低價)、鹽、糖、黑胡椒、太白粉。 (例外：高級油品/醬料 -> `others`)
- **辛香料**: 零散蒜頭、蔥花、辣椒。 (例外：整袋包裝 -> `fruit` 或 `others`)
- **非食材**: 水、冰塊。
- **附贈包**: 調味油包。

### 2. 嚴格分類清單 (Strict Category Whitelist)

所有通過過濾的物品（或單一料理的主分類），**必須** 歸類為以下 7 大類別之一。

| 類別 ID (`category`) | 類別名稱       | 涵蓋內容範例                                 |
| :------------------- | :------------- | :------------------------------------------- |
| **`fruit`**          | **蔬果類**     | 葉菜、根莖、瓜果、菇類、水果。               |
| **`frozen`**         | **冷凍調理類** | 水餃、雞塊、**微波便當**、冷凍甜點。         |
| **`bake`**           | **主食烘焙類** | 米、麵條(含義大利麵)、麵包、堅果、乾貨主食。 |
| **`milk`**           | **乳品飲料類** | 蛋、鮮奶、優格、起司、飲品。                 |
| **`seafood`**        | **冷凍海鮮類** | 魚、蝦、蟹、貝類。                           |
| **`meat`**           | **肉品類**     | 豬/牛/雞肉、加工肉品(香腸/培根)。            |
| **`others`**         | **乾貨醬料類** | 特殊調味醬、油品、醃製品、其他乾貨。         |

---

## 三、食譜消耗邏輯 (Recipe Consumption)

**適用情境**: 當判定為 **單一料理模式** 且目的是 **消耗庫存** 時。

### 1. 消耗判定

- **僅扣除**：屬於 7 大類別且已入庫的「主食材」。
- **忽略**：背景雜訊（水、調味料、蔥花）。

### 2. 範例情境

- **輸入**: "紅燒牛肉麵" (Single Dish, Category: `bake` or `meat`)
- **後台邏輯扣除**:
  - 牛肉 (`meat`) -> 扣除
  - 麵條 (`bake`) -> 扣除
  - 青江菜 (`fruit`) -> 扣除
  - (其餘忽略)

---

## 四、Prompt 角色設定建議 (Role Setup)

`You are an intelligent kitchen assistant API.`
`STEP 1: MODE CHECK. Is this a Single Dish or Grocery List?`
`- Single Dish: Return the Dish Name and its Primary Category from the strict list [fruit, frozen, bake, milk, seafood, meat, others]. Do NOT split components.`
`- Grocery List: Detect and classify each item individually into the strict list. Ignore seasonings.`
