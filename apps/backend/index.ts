import type { auth } from "@repo/auth/index";
import { type Context, Hono, type Next } from "hono";
import { serveStatic, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { safeGetSession } from "@/getSession";
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
// Core Middleware chain
// -----------------------------------------------------------------------------
app.use("*", requestId());
app.use("*", async (c, next) => {
	c.header("X-Service-Name", "Sayr.io");
	c.header("X-Organization-Name", "Doras Media Limited");
	return next();
});

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.get("/health", (c) => c.text("OK"));
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/ws-test", serveStatic({ path: "./public/ws.html" }));
app.route("/ws", wsRoute);

app.use("*", async (c, next) => {
	const session = await safeGetSession(c.req.raw.headers);
	if (!session) {
		console.warn(`⚠️  No session for ${c.req.method} ${c.req.path}`);
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});
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
