import { Hono } from "hono";
import { routeExists, type AppEnv } from "@/index";
import { apiPublicRouteV1 } from "./public/v1";
import { internalApiV1 } from "./internal/v1";
import { safeGetSession } from "@/getSession";
import { db, hasOrgPermission, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { Scalar } from "@scalar/hono-api-reference";

// Main API router
export const apiRoute = new Hono<AppEnv>();
apiRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	return next();
});
apiRoute.route("/public/v1", apiPublicRouteV1);
apiRoute.get(
	"/public",
	Scalar(() => {
		return {
			defaultHttpClient: { targetKey: "node", clientKey: "fetch" },
			theme: "deepSpace",
			hideClientButton: true,
			showDeveloperTools: "never",
			pageTitle: "Sayr.io API",
			sources: [
				{
					default: true,
					url: `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468/api/public/v1` : `https://api.${process.env.VITE_ROOT_DOMAIN}/v1`}/openapi.json`,
					title: "Public V1 API",
					slug: "public-v1",
				},
			],
		};
	})
);
apiRoute.use("*", async (c, next) => {
	const method = c.req.method;
	const path = c.req.path;
	const exists = routeExists(method, path);
	if (!exists) {
		return next();
	}
	const traceAsync = createTraceAsync();
	const session = await traceAsync("session", () => safeGetSession(c.req.raw.headers), {
		description: "Fetching user session",
		data: {},
		onSuccess: (result) =>
			result
				? {
						outcome:
							result.user.role === "system"
								? "Session verified and attached for system user"
								: "Session verified and attached",
						data: {
							user_id: result.user.id,
							user_name: result.user.name,
							user_role: result.user.role,
						},
					}
				: {
						outcome: "No active session found",
					},
	});
	if (!session) {
		console.warn(`⚠️ No session found for ${c.req.method} ${c.req.path}`);
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});
apiRoute.get("/github/org-check", async (c) => {
	const traceAsync = createTraceAsync();
	const installationId = Number(c.req.query("installation_id"));
	const stateRaw = c.req.query("state") || "{}";
	const orgId = stateRaw.split("org_")[1];
	if (!installationId || !orgId) {
		return c.text("❌ Missing installation_id or orgId", 400);
	}
	const session = c.get("session");
	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "admin.administrator"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		}
	);

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to do that",
			},
			401
		);
	}
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

apiRoute.route("/internal/v1", internalApiV1);
