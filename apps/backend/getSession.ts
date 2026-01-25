import { auth } from "@repo/auth/index";
import { auth as authSchema, db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { getCookieValue } from "./util";

// -----------------------------------------------------------------------------
// Session cache (in-memory, keyed by better-auth.session_token)
// -----------------------------------------------------------------------------
type SessionValue = Awaited<ReturnType<typeof auth.api.getSession>>;

const sessionCache = new Map<string, { value: SessionValue | null; expiresAt: number }>();

function getSessionToken(headers: Headers): string {
	const cookieHeader = headers.get("cookie");
	if (!cookieHeader) {
		return "anonymous";
	}

	// Split and clean up each cookie pair
	const cookies = cookieHeader.split(";").map((c) => c.trim());

	// Possible cookie names (with and without the __Secure- prefix)
	const cookieNames = ["__Secure-better-auth.session_token", "better-auth.session_token"];

	// Try to find the first cookie that matches any of the allowed names
	const sessionCookie = cookies.find((c) => cookieNames.some((name) => c.startsWith(`${name}=`)));

	if (!sessionCookie) {
		return "anonymous";
	}

	// Extract everything after the first "=" safely
	const [, rawValue] = sessionCookie.split("=", 2);

	try {
		return decodeURIComponent(rawValue as string);
	} catch {
		// Handle malformed or non-encoded cookies gracefully
		return rawValue || "anonymous";
	}
}
// 🧠 Simple in-memory cache for system account existence
const systemAccountCache: {
	exists: boolean;
	checkedAt: number;
	ttl: number;
	user: schema.userType | undefined;
} = {
	exists: false,
	checkedAt: 0,
	ttl: 48 * 60 * 60 * 1000, // 48 hours
	user: undefined,
};

export async function safeGetSession(headers: Headers, ms = 10_000, ttl = 1 * 60 * 1000): Promise<SessionValue | null> {
	const key = getSessionToken(headers);
	const now = Date.now();

	// 🔒 1. Internal shortcut path (supports cookie OR header)
	const sayrInternalCookie = getCookieValue(headers, "sayr_internal");
	const sayrInternalHeader = headers.get("x-internal-secret");
	const fromService = headers.get("x-internal-service");
	const userAgent = headers.get("user-agent");

	const isInternal =
		sayrInternalHeader &&
		sayrInternalCookie &&
		userAgent?.includes("Sayr-Worker/1.0") &&
		sayrInternalHeader === sayrInternalCookie &&
		sayrInternalHeader === process.env.INTERNAL_SECRET &&
		fromService === "sayr-worker";
	if (isInternal) {
		// ⚙️ Use cache if valid
		if (
			systemAccountCache.exists &&
			now - systemAccountCache.checkedAt < systemAccountCache.ttl &&
			systemAccountCache.user
		) {
			console.log("✅ System account confirmed (from cache)");
			return {
				// biome-ignore lint/suspicious/noExplicitAny: <needed>
				session: { userId: systemAccountCache.user.id } as any,
				// biome-ignore lint/suspicious/noExplicitAny: <needed>
				user: systemAccountCache.user as any,
			};
		}

		try {
			// 🚀 Minimal existence check
			const [systemAccount] = await db
				.select()
				.from(authSchema.user)
				.where(eq(authSchema.user.role, "system"))
				.limit(1);
			const exists = systemAccount !== undefined;
			systemAccountCache.exists = exists;
			systemAccountCache.checkedAt = now;
			if (exists) {
				systemAccountCache.user = systemAccount;
				console.log("✅ System account confirmed (cached 48h)");
			} else {
				console.warn("⚠️ System account missing (cached 48h anyway)");
			}
		} catch {
			console.warn("⚠️ Skipping system account check (DB error ignored)");
			systemAccountCache.exists = true;
			systemAccountCache.checkedAt = now;
		}

		// ✅ Always provide a valid system session for internal callers
		return {
			// biome-ignore lint/suspicious/noExplicitAny: <needed>
			session: { userId: systemAccountCache?.user?.id } as any,
			// biome-ignore lint/suspicious/noExplicitAny: <needed>
			user: systemAccountCache.user as any,
		};
	}

	// ✅ 2. Serve from cache if available and valid
	const cached = sessionCache.get(key);
	if (cached && cached.expiresAt > now) {
		return cached.value;
	}

	// ⏱ 3. Timeout protection
	const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

	try {
		// Fetch the real session
		const session = (await Promise.race([auth.api.getSession({ headers }), timeoutPromise])) as SessionValue;

		sessionCache.set(key, { value: session, expiresAt: now + ttl });
		return session;
	} catch {
		sessionCache.set(key, { value: null, expiresAt: now + 5_000 });
		return null;
	}
}

// 🧹 Cleanup expired cache entries once per minute
setInterval(
	() => {
		const now = Date.now();
		for (const [key, { expiresAt }] of sessionCache.entries()) {
			if (expiresAt < now) sessionCache.delete(key);
		}
	},
	1 * 60 * 1000
).unref(); // unref() ensures it won't keep process alive
// 1 minute
