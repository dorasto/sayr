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
const isProduction = process.env.APP_ENV === "production";

/** Normalises a URL to its origin (scheme + host + port), or null if unparseable. */
function toOrigin(value: string | undefined | null): string | null {
	if (!value) return null;
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

/**
 * Decides whether a browser origin may make credentialed cross-origin requests.
 *
 * This previously tested `origin.includes("localhost")` — a substring match that any
 * attacker-controlled hostname satisfies (`https://sayr-localhost.evil.com`), in every
 * environment. Combined with `credentials: true`, that let a hostile page issue
 * authenticated requests as a signed-in user *and read the responses*. Now that users
 * can mint personal API keys, that escalates to stealing a credential which outlives
 * logout, password changes, and session revocation.
 *
 * So: compare the parsed hostname, never a substring, and don't trust local hosts in
 * production. Note the first-party frontend calls the API on relative paths through the
 * proxy, so it is same-origin and does not depend on any of this.
 */
function isAllowedOrigin(origin: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(origin);
	} catch {
		return false;
	}

	// Reject exotic schemes (file:, data:, and other opaque origins).
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

	// Local development hosts, exact-matched on hostname. Unavailable in production.
	if (!isProduction) {
		const { hostname } = parsed;
		if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
		if (hostname === "127.0.0.1" || hostname === "[::1]") return true;
	}

	// The configured frontend origin, compared normalised so a trailing slash or an
	// explicit default port in the env var doesn't silently stop matching.
	const configured = toOrigin(process.env.VITE_URL_ROOT);
	return configured !== null && parsed.origin === configured;
}

app.use(
	"*",
	cors({
		origin: (origin) => {
			// Non-browser requests (curl, server-to-server) send no Origin header.
			if (!origin) return origin;
			return isAllowedOrigin(origin) ? origin : null;
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
app.get("/api/public/favicon.ico", (c) =>
	c.redirect(process.env.FAVICON_URL ?? "https://files.sayr.io/favicon.ico", 302)
);

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
					body: c.req.raw.body,
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
				body: c.req.raw.body,
			})
		);
	}

	return next();
});

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.route("/api/events", sseRoute);
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
