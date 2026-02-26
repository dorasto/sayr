import { Hono } from "hono";
import { routeExists, type AppEnv } from "@/index";
import { apiPublicRouteV1 } from "./public/v1";
import { internalApiV1 } from "./internal/v1";
import { safeGetSession } from "@/getSession";
import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { createTraceAsync, maskEmail } from "@repo/opentelemetry/trace";
import { Scalar } from "@scalar/hono-api-reference";
import { traceOrgPermissionCheck } from "@/util";

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
						user: {
							id: result.user.id,
							role: result.user.role,
							email: maskEmail(result.user.email),
						}
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

	const installationIdRaw = c.req.query("installation_id");
	const stateRaw = c.req.query("state");

	const installationId = Number(installationIdRaw);

	if (!installationIdRaw || Number.isNaN(installationId) || !stateRaw) {
		return c.text("❌ Missing or invalid parameters", 400);
	}

	// ✅ Safe state parsing
	let orgId: string | undefined;
	try {
		const match = stateRaw.match(/^org_(.+)$/);
		orgId = match?.[1];
	} catch {
		return c.text("❌ Invalid state", 400);
	}

	if (!orgId) {
		return c.text("❌ Invalid organization", 400);
	}

	const session = c.get("session");
	if (!session?.userId) {
		return c.text("❌ Not authenticated", 401);
	}

	const isAuthorized = await traceOrgPermissionCheck(
		session.userId,
		orgId,
		"admin.administrator"
	)


	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to do that",
			},
			401
		);
	}

	// ✅ Trace retries
	const found = await traceAsync(
		"findGithubInstallation",
		async () => {
			for (let attempt = 1; attempt <= 5; attempt++) {
				const found = await db.query.githubInstallation.findFirst({
					where: eq(
						schema.githubInstallation.installationId,
						installationId
					),
				});

				if (found) return found;

				await new Promise((res) =>
					setTimeout(res, 500 * attempt)
				);
			}
			return null;
		},
		{
			description: "Looking up GitHub installation",
			data: { installation_id: installationId },
		}
	);

	if (!found) {
		return c.text("❌ Installation not found", 404);
	}

	// Check if this org is already linked to this installation
	const existingLink = await db.query.githubInstallationOrg.findFirst({
		where: and(
			eq(schema.githubInstallationOrg.installationId, installationId),
			eq(schema.githubInstallationOrg.organizationId, orgId),
		),
	});

	const root =
		process.env.VITE_URL_ROOT ??
		"http://localhost:3000";

	const redirectUrl = new URL(
		`/settings/org/${orgId}/connections/github`,
		root
	).toString();

	if (existingLink) {
		// Already linked to this org — just redirect, don't error
		return c.redirect(redirectUrl, 302);
	}

	// Create the junction row linking this installation to the org
	await db.insert(schema.githubInstallationOrg).values({
		id: crypto.randomUUID(),
		installationId,
		organizationId: orgId,
		userId: session.userId,
	});

	return c.redirect(redirectUrl, 302);
});

apiRoute.route("/internal/v1", internalApiV1);
