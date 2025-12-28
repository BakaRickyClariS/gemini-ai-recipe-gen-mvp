import sharp from 'sharp';
/**
 * 根據邊界框裁切圖片
 * @param imageBuffer 原始圖片 Buffer
 * @param box 邊界框座標 (相對比例)
 * @param padding 擴展邊界比例 (預設 0.05 即 5%)
 * @returns 裁切後的圖片 Buffer (JPEG)
 */
export const cropImageByBoundingBox = async (imageBuffer, box, padding = 0.05) => {
    const metadata = await sharp(imageBuffer).metadata();
    const { width = 0, height = 0 } = metadata;
    if (!width || !height) {
        throw new Error('無法讀取圖片尺寸元數據');
    }
    // 計算實際像素座標 (含 padding)
    // x, y, width, height 是 0-1 的相對比例
    // padding 也是相對比例
    // 先計算原始 box 的像素資訊
    const boxX = box.x * width;
    const boxY = box.y * height;
    const boxW = box.width * width;
    const boxH = box.height * height;
    // 計算 padding 的像素值
    // 這裡簡單以寬高的平均值來計算 padding pixel，或是以 box 自身的大小來擴充
    // 採用 box 自身大小擴充比較合理
    const padX = boxW * padding;
    const padY = boxH * padding;
    // 計算新的裁切範圍 (限制在圖片範圍內)
    const left = Math.max(0, Math.round(boxX - padX));
    const top = Math.max(0, Math.round(boxY - padY));
    const right = Math.min(width, Math.round(boxX + boxW + padX));
    const bottom = Math.min(height, Math.round(boxY + boxH + padY));
    const extractWidth = right - left;
    const extractHeight = bottom - top;
    // 確保寬高有效
    if (extractWidth <= 0 || extractHeight <= 0) {
        throw new Error('裁切範圍無效');
    }
    return sharp(imageBuffer)
        .extract({
        left,
        top,
        width: extractWidth,
        height: extractHeight
    })
        .jpeg({ quality: 85 }) // 轉為 JPEG 壓縮
        .toBuffer();
};
/**
 * 批次裁切圖片中的多個區域
 * @param imageBuffer 原始圖片 Buffer
 * @param boxes 邊界框列表
 * @returns 裁切後的圖片 Buffer 列表 (順序對應)
 */
export const cropMultipleRegions = async (imageBuffer, boxes) => {
    // 為了效能，平行處理
    return Promise.all(boxes.map(box => cropImageByBoundingBox(imageBuffer, box)));
};
