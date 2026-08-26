import { auth } from "@repo/auth";
import type { PermissionPath } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import type { ApiKeyScope, ApiKeyScopeRecord } from "@repo/util";
import { keyScopeAllows, scopeToPermissionPath } from "@repo/util";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
import { errorResponse } from "../responses";

/**
 * The resolved identity of a personal API key, attached to the request
 * context by `requireApiKey()`. `scopes` is whatever the key's `permissions`
 * column decodes to — `null` for a key created with no scopes (or, notably,
 * an existing console-minted system key, which has never had `permissions`
 * set at all). `null` grants nothing; see `keyHasScope`.
 */
export interface ApiKeyPrincipal {
	userId: string;
	keyId: string;
	scopes: ApiKeyScopeRecord | null;
}

/**
 * Bearer-key auth for `/v1/me/*`. Deliberately uncached — unlike
 * `safeGetApiKey` (60s cache, used only by the long-lived SSE connection in
 * routes/events), `verifyApiKey` enforces the key's rate limit and
 * increments `requestCount` as part of validation, so caching it here would
 * silently skip rate limiting and freeze the usage stats the settings UI
 * displays. Call it exactly once per request.
 *
 * Maps the plugin's `RATE_LIMITED` error code to a real 429 — previously
 * every verify failure (bad key, disabled key, rate limited) collapsed into
 * a flat 401 "Invalid API key", which told a throttled caller their key was
 * broken rather than that they'd hit their limit.
 */
export function requireApiKey(): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		const traceAsync = createTraceAsync();
		const authHeader = c.req.header("authorization");
		const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

		if (!token) {
			return c.json(errorResponse("Unauthorized", "No authorization header provided"), 401);
		}

		const result = await traceAsync(
			"public.me.auth.apikey.verify",
			() => auth.api.verifyApiKey({ body: { key: token } }),
			{
				description: "Verifying API key",
				onSuccess: (r) => ({ outcome: r?.valid ? "API key verified" : "API key rejected" }),
			}
		);

		if (!result?.valid || !result.key || !result.key.enabled || !result.key.referenceId) {
			if (result?.error?.code === "RATE_LIMITED") {
				return c.json(
					errorResponse("Rate limit exceeded", "This API key has hit its rate limit. Try again shortly."),
					429
				);
			}
			return c.json(errorResponse("Invalid API key", "The provided API key is invalid, disabled, or expired."), 401);
		}

		// The plugin's own verifyApiKey response already JSON-parses `permissions`
		// (unlike a raw row read straight off the apikey table, which is why the
		// key-management CRUD route separately uses parseScopeRecord on that text
		// column) — so this is a shape check, not a parse.
		const rawScopes = result.key.permissions;
		const scopes: ApiKeyScopeRecord | null =
			rawScopes && typeof rawScopes === "object" && !Array.isArray(rawScopes)
				? (rawScopes as ApiKeyScopeRecord)
				: null;

		c.set("apiKeyPrincipal", {
			userId: result.key.referenceId,
			keyId: result.key.id,
			scopes,
		});

		return next();
	};
}

/** Pure check of the key's own recorded scopes — no org-permission lookup. */
export function keyHasScope(principal: ApiKeyPrincipal | null, scope: ApiKeyScope): boolean {
	if (!principal) return false;
	return keyScopeAllows(principal.scopes, scope);
}

/**
 * The standard chokepoint: does the key grant this scope, AND does its
 * owner genuinely hold the mapped permission in this org right now. Both
 * halves, always — a scope is a ceiling on the owner's real access, never a
 * grant in its own right. Owner permissions are re-evaluated on every call
 * (not cached with the key), so demoting a user shrinks their keys'
 * effective access immediately.
 *
 * Field-granular endpoints (task update, where different fields need
 * different scopes, and a task's creator/assignee bypasses the org-permission
 * half but never the scope half) compose `keyHasScope` and
 * `traceOrgPermissionCheck` directly instead of calling this — see
 * `me/tasks.ts`.
 */
export async function assertApiAccess(c: Context<AppEnv>, orgId: string, scope: ApiKeyScope): Promise<boolean> {
	const principal = c.get("apiKeyPrincipal");
	if (!principal) return false;
	if (!keyHasScope(principal, scope)) return false;
	// scopeToPermissionPath returns a plain string because @repo/util can't
	// import @repo/database's PermissionPath without a circular dependency —
	// packages/database's own drift guard is what proves every catalog scope's
	// permission string really is one, at compile time, so this narrowing cast
	// (not `any`/`never`) is asserting something already checked, not bypassing
	// a check.
	return traceOrgPermissionCheck(principal.userId, orgId, scopeToPermissionPath(scope) as PermissionPath);
}
