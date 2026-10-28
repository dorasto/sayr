import type { PermissionPath } from "@repo/database";
import type { ApiKeyScope } from "@repo/util";
import { scopeToPermissionPath } from "@repo/util";
import { traceOrgPermissionCheck } from "@/util";

/**
 * MCP tool access (SAY-31) reuses the same scope vocabulary as personal API
 * keys (`ApiKeyScope`, e.g. "tasks.read") rather than inventing a parallel
 * one — see `packages/util/src/api-scopes.ts`. Same double-gate as
 * `assertApiAccess`: the OAuth token must carry the scope AND its user must
 * currently hold the mapped org permission. A scope is a ceiling, never a
 * grant in its own right.
 */
export function mcpTokenHasScope(grantedScopes: readonly string[], scope: ApiKeyScope): boolean {
	return grantedScopes.includes(scope);
}

export async function assertMcpAccess(
	userId: string,
	orgId: string,
	grantedScopes: readonly string[],
	scope: ApiKeyScope
): Promise<boolean> {
	if (!mcpTokenHasScope(grantedScopes, scope)) return false;
	// scopeToPermissionPath returns a plain string because @repo/util can't import
	// @repo/database's PermissionPath without a circular dependency — mirrors the
	// same narrowing cast assertApiAccess uses, asserting something already
	// checked (the catalog drift guard), not bypassing a check.
	return traceOrgPermissionCheck(userId, orgId, scopeToPermissionPath(scope) as PermissionPath);
}
