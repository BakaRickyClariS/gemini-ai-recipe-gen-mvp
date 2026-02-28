# Backend Fix Plan: Missing Image URLs in V2 Inventory API

## Issue Description

When calling the V2 inventory API (`GET /api/v2/groups/:groupId/inventory`), the response objects for each food item are completely missing the `imageUrl` field. This causes the frontend to display broken images or empty placeholders for all inventory items, as the `<img src={item.imageUrl}>` inside `FoodCard.tsx` receives an `undefined` value.

## Affected Endpoints

- `GET /api/v2/groups/:groupId/inventory`
- `GET /api/v2/groups/:groupId/inventory/:id`
- (Potentially) `POST /api/v2/groups/:groupId/inventory` (Response payload)
- (Potentially) `PUT /api/v2/groups/:groupId/inventory/:id` (Response payload)

## Root Cause Analysis

Based on inspecting the raw API network responses, the returned item object shape looks like this:

```json
{
  "id": "...",
  "userId": "...",
  "refrigeratorId": "...",
  "name": "紅蘿蔔",
  "category": "fruit",
  "quantity": 1,
  "unit": "個",
  "purchaseDate": "...",
  ...
}
```

Notice that there is absolutely no property related to images (`imageUrl`, `image`, `photo`, etc.).
When the inventory API was migrated from V1 to V2, it appears that the `imageUrl` field was either:

1. Omitted from the `SELECT` query in the database layer.
2. Stripped out during data serialization or DTO filtering before sending the corresponding JSON response.

## Recommended Fix Steps

1. **Check Database Schema / Entity Mapping:** Verify that the Inventory Item table/model correctly maps the image string column (e.g., `image_url`).
2. **Review V2 Query Logic:** In the corresponding Backend controller or repository for the V2 inventory routes, ensure that the image URL column is specifically included in the `.select()` statement or returned fields.
3. **Review Response DTO:** If there is a DTO or a response formatter that explicitly specifies which fields are allowed to be sent to the client, please make sure `imageUrl` is added to that list.
4. **Verify POST/PUT Endpoints:** Check that items created/updated via the V2 API correctly save the Cloudinary URL string into the database.

## Expected Frontend Payload Standard

The frontend React components rely on `imageUrl` being passed back to correctly render the photos:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "03e490e4-077e-454d-b108-26a69fe6f147",
        "name": "紅蘿蔔",
        "category": "fruit",
        "imageUrl": "https://res.cloudinary.com/...", // <--- CRITICAL: RE-ADD THIS FIELD
        "quantity": 1,
        ...
      }
    ]
  }
}
```
