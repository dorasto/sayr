import type { auth } from "@repo/auth/index";
import { db, schema } from "@repo/database";
import { Scalar } from "@scalar/hono-api-reference";
import { CronJob } from "cron";
import { eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { openAPIRouteHandler } from "hono-openapi";
import { safeGetSession } from "@/getSession";
import { apiRoute } from "./routes/api";
import { apiPublicRoute } from "./routes/api/public";
import { webhookRoute } from "./routes/webhook";
import { wsRoute } from "./routes/ws";
import { checkMembershipRole } from "./util";
import { wideEventMiddleware } from "./tracing/wideEvent";
// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
		wideEvent: Record<string, unknown>;
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
// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.get("/api/health", (c) => c.text("OK"));
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/ws-test", serveStatic({ path: "./public/ws.html" }));
app.get("/file-test", serveStatic({ path: "./public/file-test.html" }));
app.route("/ws", wsRoute);
app.route("/webhook", webhookRoute);
app.use("*", wideEventMiddleware());
app.route("/api/public", apiPublicRoute);
app.get(
	"/api/public/openapi.json",
	openAPIRouteHandler(app, {
		documentation: {
			info: {
				title: "sayr.io",
				version: "1.0.0",
				description: "Sayr.io public API",
			},
			servers: [{ url: `${process.env.VITE_EXTERNAL_API_URL?.split("/api")[0]}` || "", description: "Production" }],
		},
	})
);
app.get(
	"/api",
	Scalar(() => {
		return {
			defaultHttpClient: { targetKey: "node", clientKey: "fetch" },
			theme: "deepSpace",
			hideClientButton: true,
			showDeveloperTools: "never",
			pageTitle: "Sayr.io public API",
			sources: [
				{
					default: true,
					url: "/api/public/openapi.json",
					title: "Public",
					slug: "public",
				},
			],
		};
	})
);
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
app.get("/github/org-check", async (c) => {
	const installationId = Number(c.req.query("installation_id"));
	const stateRaw = c.req.query("state") || "{}";
	const orgId = stateRaw.split("org_")[1];

	if (!installationId || !orgId) {
		return c.text("❌ Missing installation_id or orgId", 400);
	}

	const session = c.get("session");
	const isAuthorized = await checkMembershipRole(session?.userId, orgId);
	if (!isAuthorized) return c.text("❌ Unauthorized", 403);

	// Helper: retry wrapper
	async function retryFindInstallation(maxRetries = 5, delayMs = 500) {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			const found = await db.query.githubInstallation.findFirst({
				where: eq(schema.githubInstallation.installationId, installationId),
			});
			if (found) return found;

			// Wait before retrying, with backoff
			if (attempt < maxRetries) {
				await new Promise((res) => setTimeout(res, delayMs * attempt));
			}
		}
		return null;
	}

	const found = await retryFindInstallation();

	if (!found) {
		return c.text("❌ Installation not found after retries", 404);
	}

	if (found.organizationId) {
		return c.text("❌ Installation already linked", 400);
	}

	await db
		.update(schema.githubInstallation)
		.set({
			organizationId: orgId,
			userId: session?.userId || "",
		})
		.where(eq(schema.githubInstallation.installationId, installationId));

	const root = process.env.VITE_URL_ROOT || "http://localhost:3000/";
	const redirectUrl = new URL(`/admin/settings/org/${orgId}/connections/github`, root).toString();

	return c.redirect(redirectUrl, 302);
});
app.route("/api", apiRoute);

// 404 fallback
app.all("*", (c) => {
	console.warn(`🚫  Route not found: ${c.req.method} ${c.req.path}`);
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Route not found";
	wideEvent.error = {
		type: "RouteError",
		code: "NotFound",
		message: `Route ${c.req.method}:${c.req.path} not found`,
	};
	wideEvent.outcome = "error";
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
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Unhandled error";
	wideEvent.error = {
		type: err.name,
		message: err.message,
		stack: err.stack,
	};
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

// Delete invites whose expiresAt is older than 24 hours ago
new CronJob(
	"0 0 * * *",
	async () => {
		try {
			const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
			await db.delete(schema.invite).where(lt(schema.invite.expiresAt, cutoffDate));
			console.log("Expired invites older than 24 hours deleted");
		} catch (err) {
			console.error("Error deleting expired invites:", err);
		}
	},
	null,
	true
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
