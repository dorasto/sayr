import { Hono, type Context } from "hono";
import { routeExists, type AppEnv } from "@/index";
import { apiPublicRouteV1 } from "./public/v1";
import { mcpFetchHandler, mcpProtectedResourceMetadata } from "../mcp";
import { internalApiV1 } from "./internal/v1";
import { apiRouteIntegrations } from "./integrations";
import { safeGetSession } from "@/getSession";
import { db, schema } from "@repo/database";
import { and, eq, ne } from "drizzle-orm";
import { createTraceAsync, maskEmail } from "@repo/opentelemetry/trace";
import { Scalar } from "@scalar/hono-api-reference";
import { refreshGitHubTokenIfNeeded, traceOrgPermissionCheck } from "@/util";
import { Octokit } from "@octokit/rest";
import { getRedis } from "@repo/queue";
import { createAppJWT } from "@repo/util/github/auth";
import crypto from "node:crypto";
import { deleteObjectByKey, GDPR_EXPORT_PREFIX, getObjectBuffer } from "@repo/storage";
// Main API router
export const apiRoute = new Hono<AppEnv>();
apiRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	return next();
});
apiRoute.route("/public/v1", apiPublicRouteV1);
// MCP server (SAY-31) — resource identifier is `https://api.<root>/mcp`, which the
// host-based rewrite above turns into this exact path. Auth is its own OAuth
// bearer-JWT verification (see routes/mcp), never the session middleware below.
// routeExists() (below) matches on exact method, and Hono's `.all()` registers
// routes under the literal method "ALL" — invisible to that check, which is why
// this needs each method spelled out rather than a single `.all()`.
const mcpRouteHandler = (c: Context<AppEnv>) => mcpFetchHandler(c.req.raw);
apiRoute.get("/public/mcp", mcpRouteHandler);
apiRoute.post("/public/mcp", mcpRouteHandler);
apiRoute.delete("/public/mcp", mcpRouteHandler);
apiRoute.get("/public/.well-known/oauth-protected-resource/mcp", () => mcpProtectedResourceMetadata());
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
					url: `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468/v1` : `https://api.${process.env.VITE_ROOT_DOMAIN}/v1`}/openapi.json`,
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
	const exists = routeExists(method, path) || path.startsWith("/integrations/") || path.includes("/integrations/");
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
							},
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
/* ================= GITHUB APP INSTALL FLOW ================= */

/** How long a GitHub App install `state` nonce stays valid (seconds). */
const GITHUB_INSTALL_STATE_TTL_SECONDS = 30 * 60;
/** Allowed clock skew between our clock and GitHub's `created_at` (ms). */
const GITHUB_INSTALL_CLOCK_SKEW_MS = 60_000;

type GithubInstallState = { userId: string; orgId: string; issuedAt: number };

const githubInstallStateKey = (nonce: string) => `github:install-state:${nonce}`;

function parseGithubInstallState(raw: string | null): GithubInstallState | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"userId" in parsed &&
			"orgId" in parsed &&
			"issuedAt" in parsed &&
			typeof parsed.userId === "string" &&
			typeof parsed.orgId === "string" &&
			typeof parsed.issuedAt === "number"
		) {
			return { userId: parsed.userId, orgId: parsed.orgId, issuedAt: parsed.issuedAt };
		}
	} catch {
		// fall through
	}
	return null;
}

function getHttpStatus(error: unknown): number | undefined {
	return typeof error === "object" && error !== null && "status" in error
		? Number((error as { status: unknown }).status)
		: undefined;
}

/**
 * True when the user's linked GitHub OAuth account can see this installation
 * of our GitHub App (`GET /user/installations`). False on any failure.
 */
async function userTokenCanAccessInstallation(userId: string, installationId: number): Promise<boolean> {
	const githubAccount = await db.query.account.findFirst({
		where: (a) => and(eq(a.userId, userId), eq(a.providerId, "github")),
	});
	if (!githubAccount?.accessToken) return false;

	const appId = Number(process.env.GITHUB_APP_ID);
	const listsInstallation = async (token: string | null) => {
		if (!token) return false;
		const octokit = new Octokit({ auth: token });
		const installations = await octokit.paginate("GET /user/installations", { per_page: 100 });
		return installations.some((i) => i.id === installationId && i.app_id === appId);
	};

	try {
		const refreshed = await refreshGitHubTokenIfNeeded(githubAccount);
		try {
			return await listsInstallation(refreshed.accessToken);
		} catch (error) {
			if (getHttpStatus(error) !== 401 || !refreshed.refreshToken) throw error;
			const forced = await refreshGitHubTokenIfNeeded({ ...refreshed, accessTokenExpiresAt: new Date(0) });
			return await listsInstallation(forced.accessToken);
		}
	} catch (error) {
		console.warn("GitHub org-check: user installation lookup failed", getHttpStatus(error));
		return false;
	}
}

/**
 * Fallback proof for a fresh install when the user token can't vouch for it:
 * GitHub reports a brand-new install (`setup_action=install`), the installation
 * was created after the state nonce was issued, and it isn't linked to any other org.
 */
async function isFreshInstallForState(
	installationId: number,
	setupAction: string | undefined,
	state: GithubInstallState
): Promise<boolean> {
	if (setupAction !== "install") return false;
	try {
		const appOctokit = new Octokit({ auth: createAppJWT() });
		const res = await appOctokit.request("GET /app/installations/{installation_id}", {
			installation_id: installationId,
		});
		const createdAt = Date.parse(res.data.created_at);
		if (Number.isNaN(createdAt) || createdAt < state.issuedAt - GITHUB_INSTALL_CLOCK_SKEW_MS) return false;
	} catch {
		return false;
	}
	const linkedElsewhere = await db.query.githubInstallationOrg.findFirst({
		columns: { id: true },
		where: and(
			eq(schema.githubInstallationOrg.installationId, installationId),
			ne(schema.githubInstallationOrg.organizationId, state.orgId)
		),
	});
	return !linkedElsewhere;
}

/**
 * Issues a single-use, short-lived `state` nonce bound to (user, org) for the
 * GitHub App install URL. `/github/org-check` only links installations that
 * come back with a valid nonce for the signed-in user.
 */
apiRoute.post("/github/install-state", async (c) => {
	const session = c.get("session");
	if (!session?.userId) {
		return c.json({ success: false, error: "Unauthorized." }, 401);
	}

	const body: unknown = await c.req.json().catch(() => null);
	const orgId =
		typeof body === "object" && body !== null && "orgId" in body && typeof body.orgId === "string"
			? body.orgId
			: undefined;
	if (!orgId) {
		return c.json({ success: false, error: "Invalid orgId." }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.administrator");
	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to do that" }, 401);
	}

	const nonce = crypto.randomBytes(32).toString("hex");
	const state: GithubInstallState = { userId: session.userId, orgId, issuedAt: Date.now() };
	await getRedis().set(githubInstallStateKey(nonce), JSON.stringify(state), "EX", GITHUB_INSTALL_STATE_TTL_SECONDS);

	return c.json({ success: true, data: { state: nonce } });
});

apiRoute.get("/github/org-check", async (c) => {
	const traceAsync = createTraceAsync();

	const installationIdRaw = c.req.query("installation_id");
	const stateRaw = c.req.query("state");
	const setupAction = c.req.query("setup_action");

	const installationId = Number(installationIdRaw);

	if (
		!installationIdRaw ||
		!Number.isInteger(installationId) ||
		installationId <= 0 ||
		!stateRaw ||
		!/^[a-f0-9]{64}$/.test(stateRaw)
	) {
		return c.text("❌ Missing or invalid parameters", 400);
	}

	const session = c.get("session");
	if (!session?.userId) {
		return c.text("❌ Not authenticated", 401);
	}

	// Every failure past this point gets the same response, so the endpoint
	// can't be used to probe which installation IDs exist or are linked.
	const denied = () => c.text("❌ Could not link this GitHub installation", 403);

	// Consume the nonce up front: single use, whatever the outcome.
	const state = parseGithubInstallState(await getRedis().getdel(githubInstallStateKey(stateRaw)));
	if (!state || state.userId !== session.userId) {
		return denied();
	}
	const orgId = state.orgId;

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.administrator");
	if (!isAuthorized) {
		return denied();
	}

	// Prove the user actually has access to this installation before linking it.
	const canLink = await traceAsync(
		"verifyGithubInstallationAccess",
		async () =>
			(await userTokenCanAccessInstallation(session.userId, installationId)) ||
			(await isFreshInstallForState(installationId, setupAction, state)),
		{
			description: "Verifying the user can access the GitHub installation",
			data: { installation_id: installationId },
		}
	);
	if (!canLink) {
		return denied();
	}

	// The install webhook may land just after GitHub redirects here; wait for it.
	const found = await traceAsync(
		"findGithubInstallation",
		async () => {
			for (let attempt = 1; attempt <= 5; attempt++) {
				const found = await db.query.githubInstallation.findFirst({
					where: eq(schema.githubInstallation.installationId, installationId),
				});

				if (found) return found;

				await new Promise((res) => setTimeout(res, 500 * attempt));
			}
			return null;
		},
		{
			description: "Looking up GitHub installation",
			data: { installation_id: installationId },
		}
	);

	if (!found) {
		return denied();
	}

	// Check if this org is already linked to this installation
	const existingLink = await db.query.githubInstallationOrg.findFirst({
		where: and(
			eq(schema.githubInstallationOrg.installationId, installationId),
			eq(schema.githubInstallationOrg.organizationId, orgId)
		),
	});

	const root = process.env.VITE_URL_ROOT ?? "http://localhost:3000";

	const redirectUrl = new URL(`/settings/org/${orgId}/connections/github`, root).toString();

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
apiRoute.route("/integrations", apiRouteIntegrations);

apiRoute.get("/gdpr/export/download", async (c) => {
	const token = c.req.query("token");
	const key = c.req.query("key");

	if (!token || !key) {
		return new Response("Missing parameters", { status: 400 });
	}

	// Without a salt the token is just sha256(key) and anyone could mint one.
	const salt = process.env.FILE_SALT;
	if (!salt) {
		return new Response("GDPR export downloads are not configured", { status: 503 });
	}

	// Only GDPR export objects (gdpr_exports/<userId>/<timestamp>/<hash>.json) can be fetched here.
	const keyPattern = new RegExp(`^${GDPR_EXPORT_PREFIX}[A-Za-z0-9_-]+/\\d+/[a-f0-9]{64}\\.json$`);
	if (!keyPattern.test(key)) {
		return new Response("Invalid or expired token", { status: 403 });
	}

	const expected = crypto
		.createHash("sha256")
		.update(key + salt)
		.digest("hex");

	const tokenBuf = Buffer.from(token);
	const expectedBuf = Buffer.from(expected);
	if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
		return new Response("Invalid or expired token", { status: 403 });
	}

	const buffer = await getObjectBuffer(key);
	if (!buffer) {
		return new Response("File not found", { status: 404 });
	}

	await deleteObjectByKey(key);

	return new Response(new Uint8Array(buffer), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": "attachment; filename=gdpr-export.json",
		},
	});
});
