import { initTracing } from "@repo/opentelemetry";

initTracing(`sayr-backend`);

import type { auth } from "@repo/auth/index";
import { createNotificationClient, db } from "@repo/database";
import { getEdition } from "@repo/edition";
import { ensureBucketExists } from "@repo/storage";
import { sql } from "drizzle-orm";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { serveStatic, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import type { ApiKeyPrincipal } from "./lib/apiKeyAuth";
import { rootSpanPlugin } from "@/tracing/index";
import { apiRoute } from "./routes/api";
import { mcpFetchHandler, mcpProtectedResourceMetadata } from "./routes/mcp";
import sseRoute from "./routes/events";
import { renderRoute } from "./routes/render";
import { webhookRoute } from "./routes/webhook";
import { type RecordWideError, wideEventMiddleware } from "./tracing/wideEvent";
import { enqueue } from "@repo/queue";
export type AppTypeNotification =
	| "mention"
	| "comment"
	| "status_change"
	| "priority_change"
	| "assignee_added"
	| "assignee_removed";
export type AppNotificationMap = {
	mention: {
		taskId: string;
		timelineEventId?: string | undefined;
		commentId?: string;
	};
	comment: {
		taskId: string;
		commentId: string;
		preview?: string;
		timelineEventId: string | undefined;
	};
	status_change: {
		taskId: string;
		oldStatus: string;
		newStatus: string;
		timelineEventId: string | undefined;
	};
	priority_change: {
		taskId: string;
		timelineEventId: string | undefined;
	};
	assignee_added: {
		taskId: string;
		timelineEventId: string | undefined;
	};
	assignee_removed: {
		taskId: string;
		timelineEventId: string | undefined;
	};
};
export const { createNotification } = createNotificationClient<AppNotificationMap>((job) => {
	return enqueue("main", { type: "notification_create", ...job });
});
// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
		recordWideError: RecordWideError;
		// Set by requireApiKey() middleware on /v1/me routes — null everywhere
		// else (including session-authenticated internal routes).
		apiKeyPrincipal: ApiKeyPrincipal | null;
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
// CSRF
// -----------------------------------------------------------------------------
// Session cookies are SameSite=Lax and scoped to `.${root}`, so a page on any sibling
// subdomain is *same-site* and its requests carry the cookie. CORS doesn't help with
// "simple" requests (form posts, text/plain, no body) — they're sent without a preflight
// and `c.req.json()` parses a text/plain body happily. User-uploaded content is served
// from `files.<root>`, so without this an uploaded HTML file could drive the internal API
// as whoever opened it. JSON requests already need a CORS preflight, which only admits
// VITE_URL_ROOT, so hono/csrf (which only inspects form-like/missing content types) is
// enough to close the gap.

const rootDomain = process.env.VITE_ROOT_DOMAIN?.toLowerCase() || null;

// Hosts serving user-uploaded content: subdomains of root, but never a trusted origin.
// Mirrors the exclusion in @repo/auth's trustedOrigins.
const filesHosts = new Set<string>();
if (rootDomain) filesHosts.add(`files.${rootDomain}`);
try {
	const cdnHost = process.env.FILE_CDN ? new URL(process.env.FILE_CDN).hostname.toLowerCase() : "";
	if (cdnHost && cdnHost !== rootDomain) filesHosts.add(cdnHost);
} catch {
	// FILE_CDN may be unset or not an absolute URL; nothing to exclude then.
}

/**
 * Whether a browser origin belongs to this deployment: the admin app (VITE_URL_ROOT), the
 * root domain, or one of its subdomains (org portals, api) — never the user-content host.
 * Only used as a fallback for browsers that don't send `Sec-Fetch-Site` (older browsers, and
 * any browser on a plain-http non-localhost self-host, where Fetch Metadata isn't sent).
 */
function isFirstPartyOrigin(value: string | undefined | null): boolean {
	if (!value) return false;
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return false;
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
	const hostname = parsed.hostname.toLowerCase();
	if (filesHosts.has(hostname)) return false;
	if (parsed.origin === toOrigin(process.env.VITE_URL_ROOT)) return true;
	if (!isProduction) {
		if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
		if (hostname === "127.0.0.1" || hostname === "[::1]") return true;
	}
	return rootDomain !== null && (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`));
}

const csrfProtection = csrf({
	// Passes outright when Sec-Fetch-Site is "same-origin" (the browser saw the request as
	// same-origin — the normal case, since the frontends call the API on relative paths
	// through the proxy). Otherwise this decides on the Origin header.
	origin: (origin, c) => {
		// A modern browser that reported a cross-origin request: only the admin app may
		// call cross-origin, matching the CORS policy above. Same-site siblings (portals,
		// files) are refused.
		if (c.req.header("sec-fetch-site")) {
			return origin === toOrigin(process.env.VITE_URL_ROOT);
		}
		return isFirstPartyOrigin(origin);
	},
});

/**
 * CSRF guard for cookie-authenticated mutating routes. Requests carrying neither `Origin`
 * nor `Sec-Fetch-Site` aren't from a browser that could be coerced into them (every
 * browser sends Origin on non-GET requests) — they're server-to-server calls from the
 * start server functions, worker, or integrations service, and are let through.
 */
const csrfGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (!c.req.header("origin") && !c.req.header("sec-fetch-site")) {
		return next();
	}
	try {
		return await csrfProtection(c, next);
	} catch (err) {
		// Without this, app.onError would turn the 403 into a logged 500.
		if (err instanceof HTTPException && err.status === 403) {
			return c.json({ success: false, error: "Cross-site request rejected" }, 403);
		}
		throw err;
	}
};
app.use("/api/internal/*", csrfGuard);
app.use("/api/integrations/*", csrfGuard);

/**
 * For cookie-authenticated GET endpoints that change state (they can't use the CSRF
 * middleware, which skips safe methods): true when the request is a navigation or fetch
 * initiated from our own origin, or a top-level navigation the user made directly.
 * Falls back to Referer when Fetch Metadata isn't available; with neither, refuses.
 */
export function isFirstPartyBrowserRequest(c: Context<AppEnv>): boolean {
	const site = c.req.header("sec-fetch-site");
	if (site) return site === "same-origin" || site === "none";
	return isFirstPartyOrigin(c.req.header("referer"));
}

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
	const apiDomain = `api.${root}`;
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
// MCP server (SAY-31) — in dev the resource identifier is a bare http://localhost
// origin (the plugin's own loopback check accepts only that exact hostname, not
// *.localhost subdomains), so this traffic never goes through the api.<root>
// host rewrite above and needs its own top-level registration. Prod's resource is
// https://api.<root>/mcp, which always rewrites to the /api/public/mcp route
// instead (see routes/api/index.ts) — this is a no-op there, never reached.
const mcpRouteHandlerBare = (c: Context<AppEnv>) => mcpFetchHandler(c.req.raw);
app.get("/mcp", mcpRouteHandlerBare);
app.post("/mcp", mcpRouteHandlerBare);
app.delete("/mcp", mcpRouteHandlerBare);
app.get("/.well-known/oauth-protected-resource/mcp", () => mcpProtectedResourceMetadata());

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
