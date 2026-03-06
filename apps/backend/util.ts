import { canPublicAccessOrg, db, hasOrgPermission, schema } from "@repo/database";
import { createTraceAsync, type TraceAsync as type_TraceAsync } from "@repo/opentelemetry/trace";
import { and, eq, count } from "drizzle-orm";
import { createHash } from "node:crypto";
import { account } from "../../packages/database/schema/auth";
import { type Edition, getEdition, getEffectiveLimits, isCloud } from "@repo/edition";
import { RecordWideError } from "./tracing/wideEvent";

export async function getOrganization(orgId: string, userId: string): Promise<{ id: string } | null> {
	// Check if the user is a member of this org
	const membership = await db.query.member.findFirst({
		where: and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)),
	});

	// If no membership found, deny access
	if (!membership) {
		return null; // or throw new Error("Unauthorized");
	}

	// Fetch the organization itself
	const [organization] = await db
		.select({ id: schema.organization.id })
		.from(schema.organization)
		.where(eq(schema.organization.id, orgId));

	if (!organization) return null;

	return organization;
}

export async function safeGetOrganization(orgId: string, userId: string, ms = 5000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);

	try {
		return await getOrganization(orgId, userId);
	} catch (err) {
		console.warn("DB timeout / error in getOrganization", err);
		return null;
	} finally {
		clearTimeout(timer);
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <need for the cursor>
export function encodeCursor(obj: Record<string, any>): string {
	return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

// biome-ignore lint/suspicious/noExplicitAny: <need for the cursor>
export function decodeCursor<T = any>(cursor?: string): T | undefined {
	if (!cursor) return undefined;
	try {
		const str = Buffer.from(cursor, "base64url").toString("utf8");
		return JSON.parse(str);
	} catch {
		return undefined;
	}
}

export function getCookieValue(headers: Headers, name: string): string | null {
	const cookieHeader = headers.get("cookie") ?? "";
	const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
	return match ? (match[1] ?? null) : null;
}

export function getClientIP(req: Request): string {
	const cf = req.headers.get("cf-connecting-ip");
	if (cf) return cf;

	const trueClient = req.headers.get("true-client-ip");
	if (trueClient) return trueClient;

	// const xRealIP = req.headers.get("x-real-ip");
	// if (xRealIP) return xRealIP;

	const xForwardedFor = req.headers.get("x-forwarded-for");
	if (xForwardedFor)
		// Proxy chains: first IP is original client
		return xForwardedFor.split(",")[0]?.trim() || "";

	// Hono's req.raw is a Fetch Request; reaching the socket requires the adapter
	// biome-ignore lint/suspicious/noExplicitAny: <dont care>
	const raw = (req as any).raw;
	const socketAddr = raw?.socket?.remoteAddress || raw?.connection?.remoteAddress || raw?._socket?.remoteAddress;

	return socketAddr || "unknown";
}

export function getAnonHash(ip: string, userAgent: string, cookieId?: string) {
	return createHash("sha256")
		.update(`${ip}|${userAgent}|${cookieId ?? ""}|${process.env.VOTE_SALT}`)
		.digest("hex");
}

export async function traceOrgPermissionCheck(
	userId: string,
	organizationId: string,
	permission: Parameters<typeof hasOrgPermission>[2]
): Promise<boolean> {
	const traceAsync = createTraceAsync();

	if (!userId || !organizationId) {
		return false;
	}

	return traceAsync(
		"hasOrgPermission",
		() =>
			hasOrgPermission(
				userId,
				organizationId,
				permission
			),
		{
			description: "Checking organization permissions",
			data: {
				user: { id: userId },
				organization: { id: organizationId },
				permission,
			},
			onSuccess: (result) => ({
				outcome: result
					? "Permission granted"
					: "Permission denied",
			}),
		}
	);
}

type PublicAccessCheck =
	| "enablePublicPage"
	| "publicActions"
	| "both";

export async function tracePublicOrgAccessCheck(
	organizationId: string,
	check: PublicAccessCheck = "both"
): Promise<boolean> {
	const traceAsync = createTraceAsync();

	if (!organizationId) {
		return false;
	}

	return traceAsync(
		"canPublicAccessOrg",
		() => canPublicAccessOrg(organizationId, check),
		{
			description: "Checking public organization access",
			data: {
				organization: { id: organizationId },
				check,
			},
			onSuccess: (result) => ({
				outcome: result
					? "Public access allowed"
					: "Public access denied",
			}),
		}
	);
}

export async function refreshGitHubTokenIfNeeded(githubAccount: schema.accountType) {
	if (!githubAccount.refreshToken) return githubAccount;

	const now = new Date();

	// still valid → no refresh
	if (
		githubAccount.accessToken &&
		githubAccount.accessTokenExpiresAt &&
		githubAccount.accessTokenExpiresAt > now
	) {
		return githubAccount;
	}

	try {
		const res = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				grant_type: "refresh_token",
				refresh_token: githubAccount.refreshToken,
			}),
		});

		const data = await res.json();

		if (!data.access_token) {
			throw new Error("Failed refresh GitHub token");
		}

		const expiresAt = data.expires_in
			? new Date(Date.now() + data.expires_in * 1000)
			: null;

		const refreshExpiresAt = data.refresh_token_expires_in
			? new Date(Date.now() + data.refresh_token_expires_in * 1000)
			: null;

		await db
			.update(account)
			.set({
				accessToken: data.access_token,
				refreshToken: data.refresh_token ?? githubAccount.refreshToken,
				accessTokenExpiresAt: expiresAt,
				refreshTokenExpiresAt: refreshExpiresAt,
				updatedAt: new Date(),
			})
			.where(eq(account.id, githubAccount.id));

		return {
			...githubAccount,
			accessToken: data.access_token,
			refreshToken: data.refresh_token ?? githubAccount.refreshToken,
			accessTokenExpiresAt: expiresAt,
			refreshTokenExpiresAt: refreshExpiresAt,
		};
	} catch (e) {
		console.error("GitHub token refresh failed", e);
		return githubAccount;
	}
}

export async function enforceLimit({
	c,
	limitKey,
	table,
	traceName,
	entityName,
	traceAsync,
	recordWideError,
}: {
	c: any;
	limitKey: keyof ReturnType<typeof getEffectiveLimits>;
	table: any;
	traceName: string;
	entityName: string;
	traceAsync: type_TraceAsync;
	recordWideError: RecordWideError;
}): Promise<Response | undefined> {
	// Global instance-level limits only apply on self-hosted editions.
	// On cloud, per-org plan limits (canCreateResource) are the enforcement layer.
	if (isCloud()) return undefined;

	const limits = getEffectiveLimits(null);
	const limit = limits[limitKey];

	if (limit === null) return undefined;

	const edition = getEdition();

	const editionDescriptions: Record<Edition, string> = {
		cloud: "Sayr Cloud (hosted)",
		community: "Community Edition (self-hosted)",
		enterprise: "Enterprise Edition (self-hosted, licensed)",
	};

	const editionDescription = editionDescriptions[edition];

	const total = await traceAsync(
		traceName,
		async () => {
			const result = await db.select({ count: count() }).from(table);
			return result[0]?.count ?? 0;
		},
		{ description: `Counting total ${entityName}s` }
	);

	if (total >= limit) {
		await recordWideError({
			name: `${entityName}.create.limit_reached`,
			error: new Error(`${entityName} limit reached`),
			code: `${entityName.toUpperCase()}_LIMIT_REACHED`,
			message: `Maximum of ${limit} ${entityName}(s) reached for ${editionDescription}`,
			contextData: {
				currentCount: total,
				limit,
				edition,
			},
		});

		const upgradeMessage =
			edition === "community"
				? "Upgrade to the Enterprise Edition to unlock higher limits."
				: edition === "enterprise"
					? "Increase your Enterprise license limits to create more."
					: "Upgrade your Sayr Cloud plan to create more.";

		return c.json(
			{
				success: false,
				error: `You've reached the maximum of ${limit} ${entityName}(s) allowed in ${editionDescription}. ${upgradeMessage}`,
			},
			403
		);
	}

	return undefined;
}