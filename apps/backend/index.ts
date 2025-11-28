import { httpInstrumentationMiddleware } from "@hono/otel";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import type { auth } from "@repo/auth/index";
import { db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { safeGetSession } from "@/getSession";
import { apiRoute } from "./routes/api";
import { webhookRoute } from "./routes/webhook";
import { wsRoute } from "./routes/ws";
import { checkMembershipRole } from "./util";
// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
};

const traceExporter = new OTLPTraceExporter({
	url: `https://${process.env.AXIOM_BACKEND_OTEL_DOMAIN}/v1/traces`,
	headers: {
		Authorization: `Bearer ${process.env.AXIOM_BACKEND_OTEL_TOKEN}`,
		"X-Axiom-Dataset": process.env.AXIOM_BACKEND_OTEL_DATASET || "",
	},
});

// Create the OTEL SDK
const openTelemetrySDK = new NodeSDK({
	traceExporter,
});

// Start OTEL
openTelemetrySDK.start();

// -----------------------------------------------------------------------------
// App setup
// -----------------------------------------------------------------------------
const app = new Hono<AppEnv>();
// Optional request tracing instrumentation
app.use(
	httpInstrumentationMiddleware({
		serviceName: "hono-with-axiom",
		serviceVersion: process.env.APP_VERSION || "dev",
		captureRequestHeaders: [
			"user-agent",
			"x-request-id",
			"x-forwarded-for",
			"x-real-ip",
			"content-type",
			"accept",
			"origin",
			"referer",
		],
		captureResponseHeaders: ["content-type", "content-length", "x-service-name", "x-organization-name"],
	})
);
// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------
app.use(
	"*",
	cors({
		origin: [process.env.NEXT_PUBLIC_URL_ROOT as string, process.env.NEXT_PUBLIC_API_SERVER as string],
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
app.get("/health", (c) => c.text("OK"));
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/ws-test", serveStatic({ path: "./public/ws.html" }));
app.route("/ws", wsRoute);
app.route("/webhook", webhookRoute);
app.get("/metrics", (c) => {
	const mem = process.memoryUsage();
	const cpuUsage = process.cpuUsage();
	const uptime = process.uptime();

	const buildCommit = process.env.GIT_COMMIT ?? "unknown";
	const buildVersion = process.env.APP_VERSION ?? "dev";
	const buildEnv = process.env.NODE_ENV ?? "unknown";

	const metrics = {
		status: "ok",
		service: "Sayr.io backend",
		env: buildEnv,
		build: {
			version: buildVersion,
			commit: buildCommit,
		},
		runtime: {
			bunVersion: Bun.version,
			arch: process.arch,
			platform: process.platform,
			uptimeSeconds: uptime,
			cpu: {
				userSecondsTotal: cpuUsage.user / 1e6,
				systemSecondsTotal: cpuUsage.system / 1e6,
			},
			memory: {
				rssBytes: mem.rss,
				heapTotalBytes: mem.heapTotal,
				heapUsedBytes: mem.heapUsed,
				externalBytes: mem.external,
				arrayBuffersBytes: mem.arrayBuffers,
			},
			heapSpacesCount: Object.keys(mem).length,
		},
		timestamp: Date.now(),
	};

	return c.json(metrics, 200);
});
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

	const root = process.env.NEXT_PUBLIC_URL_ROOT || "http://localhost:3000/";
	const redirectUrl = new URL(`/admin/settings/org/${orgId}/connections/github`, root).toString();

	return c.redirect(redirectUrl, 302);
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
