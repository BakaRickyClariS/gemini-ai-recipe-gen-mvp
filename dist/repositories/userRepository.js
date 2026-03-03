/**
 * User Repository
 * 遵循 backend-patterns：Repository 封裝資料存取
 */
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/drizzle.js";
import { users } from "../db/schema/index.js";
export const userRepository = {
    async findById(id) {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        return result[0] || null;
    },
    async findByLineUserId(lineUserId) {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.lineUserId, lineUserId))
            .limit(1);
        return result[0] || null;
    },
    async findByEmail(email) {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        return result[0] || null;
    },
    async create(data) {
        const [created] = await db.insert(users).values(data).returning();
        return created;
    },
    /**
     * Account Linking 邏輯：
     * 1. lineUserId 已存在 → 直接登入
     * 2. 同 email 帳號存在 → 自動綁定 LINE
     * 3. 全新用戶 → 建立帳號 (provider = 'line')
     */
    async upsertByLineId(lineUserId, data) {
        // 1. 已綁定 LINE 的舊用戶
        const byLine = await this.findByLineUserId(lineUserId);
        if (byLine) {
            // 更新 profile 資訊（displayName 或頭像可能有變）
            const [updated] = await db
                .update(users)
                .set({
                displayName: data.displayName,
                profilePictureUrl: data.profilePictureUrl,
                updatedAt: new Date(),
            })
                .where(eq(users.id, byLine.id))
                .returning();
            return updated;
        }
        // 2. 有同 email 帳號 → 自動綁定
        if (data.email) {
            const byEmail = await this.findByEmail(data.email);
            if (byEmail) {
                const [linked] = await db
                    .update(users)
                    .set({
                    lineUserId,
                    profilePictureUrl: data.profilePictureUrl ?? byEmail.profilePictureUrl,
                    updatedAt: new Date(),
                })
                    .where(eq(users.id, byEmail.id))
                    .returning();
                return linked;
            }
        }
        // 3. 全新用戶
        const [created] = await db
            .insert(users)
            .values({
            id: uuidv4(),
            lineUserId,
            displayName: data.displayName,
            profilePictureUrl: data.profilePictureUrl,
            provider: "line",
        })
            .returning();
        return created;
    },
    // 保留原 upsert 供舊路徑相容（若有依賴）
    async upsert(id, data) {
        const existing = await this.findById(id);
        if (existing) {
            await db
                .update(users)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(users.id, id));
            return { ...existing, ...data };
        }
        const [created] = await db
            .insert(users)
            .values({ id, ...data })
            .returning();
        return created;
    },
    async updateProfile(id, data) {
        const [updated] = await db
            .update(users)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();
        return updated || null;
    },
};
