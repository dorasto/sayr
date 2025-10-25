import { auth } from "@repo/auth/index";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { apiRoute } from "./routes/api";
import { wsRoute } from "./routes/ws";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
};

// -----------------------------------------------------------------------------
// App setup
// -----------------------------------------------------------------------------
const app = new Hono<AppEnv>();

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------
app.use(
	"*",
	cors({
		origin: [process.env.NEXT_PUBLIC_URL_ROOT as string, process.env.NEXT_PUBLIC_API_SERVER as string],
		allowMethods: ["POST", "GET", "PATCH", "PUT"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		maxAge: 600,
		credentials: true,
	})
);

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

async function safeGetSession(
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

// -----------------------------------------------------------------------------
// Core Middleware chain
// -----------------------------------------------------------------------------
app.use("*", requestId());
app.get("/health", (c) => c.text("OK"));
app.get("/", serveStatic({ path: "./public/index.html" }));

app.use("*", async (c, next) => {
	c.header("X-Service-Name", "Sayr.io");
	c.header("X-Organization-Name", "Doras Media Limited");

	const session = await safeGetSession(c.req.raw.headers);
	if (!session) {
		console.warn(`⚠️  No session for ${c.req.method} ${c.req.path}`);
		return next();
	}

	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.route("/ws", wsRoute);
app.get("/ws-test", serveStatic({ path: "./public/ws.html" }));
app.route("/api", apiRoute);

// 404 fallback
app.all("*", (c) => {
	console.warn(`🚫  Route not found: ${c.req.method} ${c.req.path}`);
	return c.json(
		{
			message: `Route ${c.req.method}:${c.req.path} not found`,
			error: "Not Found",
			status: 404,
		},
		404
	);
});

// -----------------------------------------------------------------------------
// Error handling
// -----------------------------------------------------------------------------
app.onError((err, c) => {
	console.error("🔥  Hono error caught:");
	console.error("  Path:", c.req.path);
	console.error("  Method:", c.req.method);
	console.error("  Stack:", err.stack ?? "No stack trace");
	return c.json(
		{
			success: false,
			error: err.cause?.toString() ?? err.toString(),
			path: c.req.path,
			method: c.req.method,
		},
		500
	);
});

// -----------------------------------------------------------------------------
// Server export (for Bun)
// -----------------------------------------------------------------------------
export default {
	port: 5468,
	fetch: app.fetch,
	websocket,
	idleTimeout: 0,
	error(err: unknown) {
		console.error("🔥  Bun-level error:", err);
		return new Response("Server error", { status: 500 });
	},
};
