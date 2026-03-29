import { auth } from "@repo/auth/index";
import { auth as authSchema, db } from "@repo/database";
import { eq } from "drizzle-orm";

const apiKeyCache = new Map<
    string,
    {
        value: {
            account: {
                id: string;
                name: string;
                displayName: string | null;
                email: string;
                emailVerified: boolean;
                image: string | null;
                createdAt: Date;
                updatedAt: Date;
                role: string | null;
                banned: boolean | null;
                banReason: string | null;
                banExpires: Date | null;
                twoFactorEnabled: boolean | null;
                lastLoginMethod: string | null;
            }
        } | null; expiresAt: number
    }
>();

export async function safeGetApiKey(
    key: string,
    ttl = 60_000
): Promise<{ account: typeof authSchema.user.$inferSelect } | null> {
    const now = Date.now();

    const cached = apiKeyCache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.value as { userId: string; account: any };
    }

    try {
        const result = await auth.api.verifyApiKey({ body: { key } });

        const valid =
            result &&
            result.valid === true &&
            result.key &&
            result.key.enabled === true &&
            typeof result.key.userId === "string";

        if (!valid) {
            return null;
        }
        if (!result.key?.userId) return null

        // Fetch full user account
        const [account] = await db
            .select()
            .from(authSchema.user)
            .where(eq(authSchema.user.id, result.key?.userId))
            .limit(1);

        if (!account) {
            // user doesn't exist
            return null;
        }

        // cache it
        apiKeyCache.set(key, {
            value: { account },
            expiresAt: now + ttl,
        });

        return { account };
    } catch {
        apiKeyCache.set(key, { value: null, expiresAt: now + 5000 });
        return null;
    }
}