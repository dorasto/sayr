import { auth } from "@repo/auth/index";

// -----------------------------------------------------------------------------
// Session cache (in-memory, keyed by better-auth.session_token)
// -----------------------------------------------------------------------------
type SessionValue = Awaited<ReturnType<typeof auth.api.getSession>>;

const sessionCache = new Map<string, { value: SessionValue | null; expiresAt: number }>();

function getSessionToken(headers: Headers): string {
	const cookieHeader = headers.get("cookie") ?? "";
	const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
	return match?.[1] ?? "anonymous";
}

export async function safeGetSession(
	headers: Headers,
	ms = 10_000,
	ttl = 1 * 60 * 1000 // cache duration: 1 minute by default
): Promise<SessionValue | null> {
	const key = getSessionToken(headers);
	const now = Date.now();

	// ✅ 1. Serve from cache if valid
	const cached = sessionCache.get(key);
	if (cached && cached.expiresAt > now) {
		return cached.value;
	}

	// ⏱ 2. Timeout protection for session fetch
	const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

	try {
		const session = (await Promise.race([auth.api.getSession({ headers }), timeoutPromise])) as SessionValue;

		// Store (including null) with expiry
		sessionCache.set(key, { value: session, expiresAt: now + ttl });
		return session;
	} catch (err) {
		console.warn("⚠️ safeGetSession: timeout or error while fetching session:", err);
		// Cache short failure window (5 s) to prevent auth storming
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
