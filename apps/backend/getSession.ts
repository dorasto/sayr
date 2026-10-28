import { auth } from "@repo/auth/index";
import { auth as authSchema, db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { getCookieValue } from "./util";

// -----------------------------------------------------------------------------
// Session cache (in-memory, keyed by the verified Better Auth session cookie value)
// -----------------------------------------------------------------------------
type SessionValue = Awaited<ReturnType<typeof auth.api.getSession>>;

// Startup diagnostic: log env vars that control session cookie naming/signing
console.log(
	"[safeGetSession] init — APP_ENV:",
	process.env.APP_ENV || "(not set)",
	"| BETTER_AUTH_URL:",
	process.env.BETTER_AUTH_URL || "(not set)",
	"| BETTER_AUTH_SECRET set:",
	!!process.env.BETTER_AUTH_SECRET
);

const sessionCache = new Map<string, { value: SessionValue | null; expiresAt: number }>();

// The session cookie name Better Auth actually reads in this environment (depends on
// useSecureCookies / cookiePrefix). Only this cookie may be used as a cache key — keying on
// a cookie Better Auth ignores would let a planted cookie alias someone else's session.
let sessionCookieNamePromise: Promise<string> | null = null;
function getSessionCookieName(): Promise<string> {
	sessionCookieNamePromise ??= auth.$context
		.then((ctx) => ctx.authCookies.sessionToken.name)
		.catch(() => `${process.env.APP_ENV === "production" ? "__Secure-" : ""}better-auth.session_token`);
	return sessionCookieNamePromise;
}

/**
 * Returns the cache key for this request: the raw value of the session cookie Better Auth
 * verifies, "anonymous" when absent, or `null` when the request is ambiguous (the cookie is
 * sent more than once) and must not be cached.
 */
function getSessionToken(headers: Headers, cookieName: string): string | null {
	const cookieHeader = headers.get("cookie");
	if (!cookieHeader) {
		return "anonymous";
	}

	// Split and clean up each cookie pair
	const cookies = cookieHeader.split(";").map((c) => c.trim());
	const matches = cookies.filter((c) => c.startsWith(`${cookieName}=`));

	if (matches.length === 0) {
		// Log cookie names present (values masked) to diagnose mismatched cookie names
		const presentNames = cookies.map((c) => c.split("=")[0]).join(", ");
		console.warn("[safeGetSession] no session_token cookie found. Cookie names present:", presentNames || "(none)");
		return "anonymous";
	}

	if (matches.length > 1) {
		// Duplicate session cookies (e.g. one planted from a sibling subdomain) — we can't know
		// which one Better Auth will verify, so bypass the cache for this request.
		return null;
	}

	// Extract everything after the first "=" safely
	const rawValue = (matches[0] as string).slice(cookieName.length + 1);

	try {
		return decodeURIComponent(rawValue);
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

// Kept short: a revoked/signed-out session stays usable from this cache until the entry expires.
export async function safeGetSession(headers: Headers, ms = 10_000, ttl = 10_000): Promise<SessionValue | null> {
	const key = getSessionToken(headers, await getSessionCookieName());
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
	const cached = key === null ? undefined : sessionCache.get(key);
	if (cached && cached.expiresAt > now) {
		if (cached.value === null) {
			console.warn(
				"[safeGetSession] serving cached null for token prefix:",
				key?.slice(0, 8),
				"— expires in",
				Math.round((cached.expiresAt - now) / 1000),
				"s"
			);
		}
		return cached.value;
	}

	// ⏱ 3. Timeout protection
	const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

	try {
		// Fetch the real session
		const session = (await Promise.race([auth.api.getSession({ headers }), timeoutPromise])) as SessionValue;

		// Cache with full TTL if session found; shorter TTL if getSession returned null (e.g. expired/invalid token).
		// A session is only cached when the token Better Auth verified is the one in our cache key
		// (cookie value is "<token>.<signature>"), so a cache hit can only go to a request presenting
		// that exact verified cookie.
		if (key !== null) {
			if (!session) {
				sessionCache.set(key, { value: null, expiresAt: now + 10_000 });
				console.warn(
					"[safeGetSession] getSession returned null for token prefix:",
					key.slice(0, 8),
					"(cached 10s)"
				);
			} else if (session.session?.token && session.session.token === key.split(".")[0]) {
				sessionCache.set(key, { value: session, expiresAt: now + ttl });
			}
		}
		return session;
	} catch (err) {
		const isTimeout = err instanceof Error && err.message === "Timeout";
		console.error(
			`[safeGetSession] ${isTimeout ? "TIMEOUT" : "ERROR"} for token prefix ${key?.slice(0, 8) ?? "(uncached)"}:`,
			isTimeout ? `exceeded ${ms}ms` : err
		);
		if (key !== null) {
			sessionCache.set(key, { value: null, expiresAt: now + 5_000 });
		}
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
