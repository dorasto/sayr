import { initTracing } from "@repo/opentelemetry";
initTracing(`sayr-backend`);
import type { auth } from "@repo/auth/index";
import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { apiRoute } from "./routes/api";
import { webhookRoute } from "./routes/webhook";
import { type RecordWideError, wideEventMiddleware } from "./tracing/wideEvent";
import { rootSpanPlugin } from "@/tracing/index";
import { renderRoute } from "./routes/render";
import { ensureBucketExists } from "@repo/storage";
import { getEdition } from "@repo/edition";
import sseRoute from "./routes/events";
// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
		recordWideError: RecordWideError;
	};
};

// // -----------------------------------------------------------------------------
// App setup
// -----------------------------------------------------------------------------
const app = new Hono<AppEnv>();
const edition = getEdition();
if (edition === "community" || edition === "enterprise") {
	ensureBucketExists();
}
// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------
app.use(
	"*",
	cors({
		origin: (origin) => {
			// Allow non-browser requests
			if (!origin) return origin;
			// Allow all localhost (any port, any subdomain)
			if (origin.includes("localhost")) {
				return origin;
			}
			// Allow prod frontend
			if (origin === process.env.VITE_URL_ROOT) {
				return origin;
			}
			return null;
		},
		allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
		allowHeaders: ["Content-Type", "Authorization"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		credentials: true,
		maxAge: 600,
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
app.get("/favicon.ico", (c) => c.redirect(process.env.FAVICON_URL ?? "https://files.sayr.io/favicon.ico", 302));
app.get("/api/public/favicon.ico", (c) => c.redirect(process.env.FAVICON_URL ?? "https://files.sayr.io/favicon.ico", 302));

app.use("*", async (c, next) => {
	const root = process.env.VITE_ROOT_DOMAIN;
	let apiDomain = `api.${root}`;
	const { hostname } = new URL(c.req.url);
	const docs = `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468` : `https://api.${process.env.VITE_ROOT_DOMAIN}`}`;
	if (hostname === apiDomain) {
		const url = new URL(c.req.url);
		const method = c.req.method;
		const path = url.pathname;

		if (path.startsWith("/api/public") || path.startsWith("/api/events")) {
			return next();
		}

		if (path === "/events") {
			url.pathname = "/api/events";

			const exists = routeExists(method, url.pathname);
			if (!exists) {
				return c.json({ error: "Route not found", docs }, 404);
			}

			return app.fetch(
				new Request(url.toString(), {
					method,
					headers: c.req.raw.headers,
					body: c.req.raw.body
				})
			);
		}

		if (path === "/") {
			url.pathname = "/api/public";
		} else {
			url.pathname = "/api/public" + path;
		}

		const exists = routeExists(method, url.pathname);
		if (!exists) {
			return c.json({ error: "Route not found", docs }, 404);
		}

		return app.fetch(
			new Request(url.toString(), {
				method,
				headers: c.req.raw.headers,
				body: c.req.raw.body
			})
		);
	}

	return next();
});

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.route("/api/events", sseRoute)
app.get("/", serveStatic({ path: "./public/index.html" }));
app.route("/render", renderRoute);
app.get("/api/health", async (c) => {
	const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000));
	let dbOk = false;
	try {
		await Promise.race([db.execute(sql`select 1`), timeout]);
		dbOk = true;
	} catch {
		dbOk = false;
	}
	const healthy = dbOk;
	return c.json(
		{
			status: healthy ? "healthy" : "unhealthy",
			checks: { database: dbOk ? "ok" : "unavailable" },
		},
		healthy ? 200 : 503
	);
});
app.use("*", rootSpanPlugin());
app.use("*", wideEventMiddleware());
app.route("/api/webhook", webhookRoute);
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
		404
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
		500
	);
});
export function routeExists(method: string, urlPath: string): boolean {
	if (!app.routes) return false;

	const m = method.toUpperCase();
	const path = urlPath.replace(/\/+$/, "") || "/";

	for (const r of app.routes) {
		if (r.method !== m) continue;

		// Normalise each registered route
		const full = r.path;
		// Replace parameters such as :id → [^/]+
		const pattern = `^${full.replace(/:[^/]+/g, "[^/]+")}$`;
		if (new RegExp(pattern).test(path)) {
			return true;
		}
	}
	return false;
}

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
