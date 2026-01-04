import { Hono } from "hono";
import { routeExists, type AppEnv } from "@/index";
import { apiRouteAdmin } from "./admin";
import { apiRouteFile } from "./file";
import { apiRouteConsole } from "./console";
import { apiPublicRoute } from "./public";
import { openAPIRouteHandler } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { safeGetSession } from "@/getSession";
import { checkMembershipRole } from "@/util";
import { db, schema } from "@repo/database";
import { eq } from "drizzle-orm";

// Main API router
export const apiRoute = new Hono<AppEnv>();
apiRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	return next();
});
apiRoute.get(
	"/",
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
apiRoute.route("/public", apiPublicRoute);
apiRoute.get(
	"/public/openapi.json",
	openAPIRouteHandler(apiRoute, {
		documentation: {
			info: {
				title: "sayr.io",
				version: "1.0.0",
				description: "Sayr.io public API",
			},
			servers: [
				{
					url: `${process.env.VITE_EXTERNAL_API_URL}` || "",
					description: "Production",
				},
			],
		},
	})
);
apiRoute.use("*", async (c, next) => {
	const recordWideEvent = c.get("recordWideEvent");
	const method = c.req.method;
	const path = c.req.path;
	const exists = routeExists(method, path);
	if (!exists) {
		return next();
	}
	// otherwise continue with session logic
	const session = await safeGetSession(c.req.raw.headers);
	if (!session) {
		await recordWideEvent({
			name: "session.missing",
			description: "No active session found for this request",
			data: {},
		});
		console.warn(`⚠️ No session found for ${c.req.method} ${c.req.path}`);
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	await recordWideEvent({
		name: "session.retrieved",
		description: "User session verified and attached",
		data: {
			user_id: session.user.id,
			user_name: session.user.name,
			user_role: session.user.role,
		},
	});
	return next();
});
apiRoute.get("/github/org-check", async (c) => {
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

// Admin routes
apiRoute.route("/admin", apiRouteAdmin);

// Admin routes
apiRoute.route("/console", apiRouteConsole);

// File routes
apiRoute.route("/file", apiRouteFile);
