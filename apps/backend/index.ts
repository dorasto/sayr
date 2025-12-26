import { initTracing } from "./tracing";
initTracing();
import type { auth } from "@repo/auth/index";
import { db, schema } from "@repo/database";
import { CronJob } from "cron";
import { lt } from "drizzle-orm";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { apiRoute } from "./routes/api";
import { webhookRoute } from "./routes/webhook";
import { wsRoute } from "./routes/ws";
import {
	type RecordWideError,
	type RecordWideEvent,
	wideEventMiddleware,
} from "./tracing/wideEvent";
import { rootSpanMiddleware } from "@/tracing/rootSpanMiddleware";
// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
		recordWideEvent: RecordWideEvent;
		recordWideError: RecordWideError;
	};
};

// // -----------------------------------------------------------------------------
// App setup
// -----------------------------------------------------------------------------
const app = new Hono<AppEnv>();
// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------
app.use(
	"*",
	cors({
		origin: [process.env.VITE_URL_ROOT as string],
		allowMethods: ["POST", "GET", "PATCH", "PUT", "DELETE"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		maxAge: 600,
		credentials: true,
	}),
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
app.get("/favicon.ico", (c) =>
	c.redirect(
		process.env.FAVICON_URL ?? "https://files.sayr.io/favicon.ico",
		302,
	),
);
// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/ws-test", serveStatic({ path: "./public/ws.html" }));
app.get("/file-test", serveStatic({ path: "./public/file-test.html" }));
app.route("/ws", wsRoute);
app.route("/api/webhook", webhookRoute);
app.use("*", rootSpanMiddleware());
app.use("*", wideEventMiddleware());
app.route("/api", apiRoute);

// 404 fallback
app.all("*", async (c) => {
	console.warn(`🚫  Route not found: ${c.req.method} ${c.req.path}`);

	const recordWideError = c.get("recordWideError");
	await recordWideError({
		name: "route.notFound",
		error: new Error("Route not found"),
		message: `Route ${c.req.method}:${c.req.path} not found`,
		code: "NotFound",
		contextData: {
			method: c.req.method,
			path: c.req.path,
		},
	});

	return c.json(
		{
			message: `Route ${c.req.method}:${c.req.path} not found`,
			error: "Not Found",
			status: 404,
		},
		404,
	);
});

// -----------------------------------------------------------------------------
// Error handling
// -----------------------------------------------------------------------------
app.onError(async (err, c) => {
	console.error("🔥  Hono error caught:");
	console.error("  Path:", c.req.path);
	console.error("  Method:", c.req.method);
	console.error("  Stack:", err.stack ?? "No stack trace");

	const recordWideError = c.get("recordWideError");
	await recordWideError({
		name: "app.error",
		error: err,
		code: "UnhandledError",
		message: err.message ?? err.toString(),
		contextData: {
			path: c.req.path,
			method: c.req.method,
			stack: err.stack ?? "No stack trace",
		},
	});

	return c.json(
		{
			success: false,
			error: err.cause?.toString() ?? err.toString(),
			path: c.req.path,
			method: c.req.method,
		},
		500,
	);
});
// Delete invites whose expiresAt is older than 24 hours ago
new CronJob(
	"0 0 * * *",
	async () => {
		try {
			const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
			await db
				.delete(schema.invite)
				.where(lt(schema.invite.expiresAt, cutoffDate));
			console.log("Expired invites older than 24 hours deleted");
		} catch (err) {
			console.error("Error deleting expired invites:", err);
		}
	},
	null,
	true,
);

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
