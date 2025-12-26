FuFOOD API 規格文件
本文件根據 Postman Collection fufood 整理而成，定義了系統中所有用戶、群組及購物清單的 API 接口。

第一次要先把資料庫資料表件出來： npm run migrate up

##1. 基礎設定
Base URL: http://localhost:3000/api/v1
認證方式: Bearer Token


##2. 用戶與認證 (User & Authentication)
###2.1 註冊新用戶
- Method: POST
- URL: /user
- Body (JSON):
```json
{
    "username": "JJ",
    "email": "JJ@gmail.com"
}
```

###2.2 用戶登入
- Method: POST
- URL: /auth/login
- Body (JSON):
```json
{
    "email": "zoe@gmail.com"
}
```

###2.3 查詢特定用戶
- Method: GET
- URL: /user/:userId
- 權限: Bearer Token
- RESPONSE:
```json
{
    "status": true,
    "message": "success",
    "data": {
        "user": {
            "id": 1,
            "username": "zoe",
            "password": null,
            "email": "zoe@gmail.com",
            "phone": null,
            "avatar": null,
            "line_id": null,
            "createdAt": "2025-12-25T10:00:03.197Z",
            "updatedAt": "2025-12-25T10:00:03.197Z"
        }
    }
}
```

###2.4 搜尋用戶
- Method: POST
- URL: /search/users
- 權限: Bearer Token
- Body (JSON):
```json
{
    "keyword": "zoe"
}
```

##3. 群組管理 (食材庫)
###3.1 查詢用戶的所有群組
- Method: GET
- URL: /user/:userId/groups
- 權限: Bearer Token
- RESPONSE:
```json
{
    "status": true,
    "message": "success",
    "data": {
        "groups": [
            {
                "id": 1,
                "name": "My Home",
                "admin_id": 1,
                "photo": null,
                "createdAt": "2025-12-25T10:00:03.241Z",
                "updatedAt": "2025-12-25T10:00:03.241Z",
                "admin": {
                    "id": 1,
                    "username": "zoe"
                },
                "members": [
                    {
                        "id": 1,
                        "username": "zoe",
                        "avatar": null
                    },
                    {
                        "id": 2,
                        "username": "JJ",
                        "avatar": null
                    }
                ]
            }
        ]
    }
}
```

###3.2 查詢特定群組詳情
- Method: GET
- URL: /group/:groudId
- 權限: Bearer Token
- RESPONSE:
```json
{
    "status": true,
    "message": "success",
    "data": {
        "id": 1,
        "name": "My Home",
        "admin_id": 1,
        "photo": null,
        "createdAt": "2025-12-25T10:00:03.241Z",
        "updatedAt": "2025-12-25T10:00:03.241Z",
        "admin": {
            "id": 1,
            "username": "zoe"
        },
        "members": [
            {
                "id": 1,
                "username": "zoe",
                "avatar": null
            },
            {
                "id": 2,
                "username": "JJ",
                "avatar": null
            }
        ]
    }
}
```

###3.3 新增成員至群組
- Method: POST
- URL: /group/:groudId/user/:userId
- 權限: Bearer Token

###3.4 刪除群組成員
- Method: DELETE
- URL: /group/:groudId/user/:userId
- 權限: Bearer Token

##4. 購物(共享)清單
###4.1 新增購物(共享)清單
- Method: POST
- URL: /shopping_list
- 權限: Bearer Token
- Body (JSON):
```json
{
    "group_id": 1,
    "name": "LOPIA 買什麼",
    "start_buy_date": "2025-12-27",
    "end_buy_date": "2025-12-29",
    "is_notify": false
}
```

###4.2 查詢特定購物(共享)清單
- Method: GET
- URL: /shopping_list/:shoppingListId
- 權限: Bearer Token
- RESPONSE:
```json
{
    "status": true,
    "message": "success",
    "data": {
        "id": 1,
        "group_id": 1,
        "name": "LOPIA 購買 000",
        "start_buy_date": "2025-12-23T00:00:00.000Z",
        "end_buy_date": "2025-12-25T23:59:59.000Z",
        "is_notify": false,
        "photo": null,
        "createdAt": "2025-12-26T06:44:33.013Z",
        "updatedAt": "2025-12-26T14:24:39.822Z"
    }
}
```

###4.3 編輯購物(共享)清單
- Method: PUT
- URL: /shopping_list/:shoppingListId
- 權限: Bearer Token
- Body (JSON):
```json
{
    "name": "LOPIA 購買 000",
    "start_buy_date": "2025-12-23",
    "end_buy_date": "2025-12-25",
    "is_notify": false
}
```

###4.4 刪除購物(共享)清單
- Method: DELETE
- URL: /shopping_list/:shoppingListId
- 權限: Bearer Token

###4.5 獲取群組的所有購物(共享)清單 (含狀態篩選)
- Method: GET
- URL: /group/:groupId/shopping_lists?status=ongoing
```
status 參數: ongoing, pending, history

ongoing (進行中)
pending (待採買)
history (歷史清單)
```
- 權限: Bearer Token
- RESPONSE:
```json
{
    "status": true,
    "message": "success",
    "data": [
        {
            "id": 4,
            "group_id": 1,
            "name": "LOPIA 買買買拉 88",
            "start_buy_date": "2025-12-26T00:00:00.000Z",
            "end_buy_date": "2025-12-26T23:59:59.000Z",
            "is_notify": false,
            "photo": null,
            "createdAt": "2025-12-26T14:26:15.006Z",
            "updatedAt": "2025-12-26T14:26:15.006Z"
        },
        {
            "id": 3,
            "group_id": 1,
            "name": "LOPIA 買買買拉",
            "start_buy_date": "2025-12-25T00:00:00.000Z",
            "end_buy_date": "2025-12-27T23:59:59.000Z",
            "is_notify": false,
            "photo": null,
            "createdAt": "2025-12-26T14:26:03.902Z",
            "updatedAt": "2025-12-26T14:26:03.902Z"
        }
    ]
}
```

##5. 購物(共享)清單項目
###5.1 新增購物(共享)清單項目
- Method: POST
- URL: /shopping_list/:shoppingListId/item
- 權限: Bearer Token
- Body (JSON):
```json
{
    "name": "和牛",
    "num": 200,
    "unit": "克"
}
```

###5.2 查詢單一項目詳情
- Method: GET
- URL: /shopping_list/:shoppingListId/item/:shoppingListItemId
- 權限: Bearer Token
- RESPONSE:
```json
{
    "status": true,
    "message": "success",
    "data": {
        "id": 3,
        "shopping_list_id": 1,
        "user_id": 1,
        "name": "烏龍麵",
        "num": 2,
        "unit": "包",
        "photo": null,
        "createdAt": "2025-12-26T07:08:37.248Z",
        "updatedAt": "2025-12-26T07:08:37.248Z"
    }
}
```

###5.3 獲取清單中所有項目
- Method: GET
- URL: /shopping_list/:shoppingListId/items
- 權限: Bearer Token
- RESPONSE:
```json
{
    "status": true,
    "message": "success",
    "data": [
        {
            "user": {
                "id": 1,
                "username": "zoe",
                "avatar": null
            },
            "items": [
                {
                    "id": 3,
                    "shopping_list_id": 1,
                    "user_id": 1,
                    "name": "烏龍麵",
                    "num": 2,
                    "unit": "包",
                    "photo": null,
                    "createdAt": "2025-12-26T07:08:37.248Z",
                    "updatedAt": "2025-12-26T07:08:37.248Z"
                },
                {
                    "id": 4,
                    "shopping_list_id": 1,
                    "user_id": 1,
                    "name": "和牛",
                    "num": 200,
                    "unit": "克",
                    "photo": null,
                    "createdAt": "2025-12-26T07:09:37.561Z",
                    "updatedAt": "2025-12-26T07:09:37.561Z"
                }
            ]
        }
    ]
}
```
