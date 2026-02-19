import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { config } from "../config/unifiedConfig.js";
// 設定 Cloudinary
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});
/**
 * 上傳圖片至 Cloudinary
 * 自動判斷是否使用 Unsigned 模式 (若無 API Key)
 * @param file 檔案路徑 (string) 或 Buffer
 */
export async function uploadToCloudinary(file) {
    const hasApiKey = !!config.cloudinary.apiKey;
    const uploadPreset = config.cloudinary.uploadPreset || undefined;
    // 1. 檢查是否缺漏必要設定
    if (!hasApiKey && !uploadPreset) {
        throw new Error("Cloudinary configuration missing: Must provide either API_KEY/SECRET or UPLOAD_PRESET.");
    }
    // 2. 準備上傳選項
    const options = {
        folder: "fufood",
        resource_type: "image",
        transformation: [
            { quality: "auto", fetch_format: "auto" },
            { width: 1200, crop: "limit" },
        ],
    };
    // 3. Unsigned Mode (無 API Key，必須有 Preset)
    if (!hasApiKey && uploadPreset) {
        // Unsigned upload 只支援 file path (string)，不支援 stream upload
        if (typeof file !== "string") {
            throw new Error("Unsigned upload only supports file paths. Please provide a file path string.");
        }
        return cloudinary.uploader.unsigned_upload(file, uploadPreset, options);
    }
    // 4. Signed Mode (標準模式)
    if (uploadPreset) {
        options.upload_preset = uploadPreset;
    }
    return new Promise((resolve, reject) => {
        // A. 處理 Buffer (Stream)
        if (file instanceof Buffer) {
            const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            Readable.from(file).pipe(uploadStream);
            return;
        }
        // B. 處理檔案路徑 (String)
        if (typeof file === "string") {
            cloudinary.uploader.upload(file, options).then(resolve).catch(reject);
            return;
        }
        reject(new Error("Invalid file type. Must be string (path) or Buffer."));
    });
}
