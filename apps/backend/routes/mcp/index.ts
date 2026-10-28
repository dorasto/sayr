import { createMcpProtectedRequestHandler } from "@better-auth/mcp";
import { mcpOAuthConfig } from "@repo/auth";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { claimsFromAuthInfo, type McpUserClaims } from "./context";
import { registerCommentTools } from "./tools/comments";
import { registerIdentityTools } from "./tools/identity";
import { registerReferenceTools } from "./tools/reference";
import { registerReleaseTools } from "./tools/releases";
import { registerTaskTools } from "./tools/tasks";

/**
 * MCP server (SAY-31) for Sayr's API — lets an AI agent act on a user's
 * behalf against tasks, comments, labels and more, authenticated via the
 * Better Auth `mcp()` OAuth provider wired in `@repo/auth`. apps/backend runs
 * as a separate process from where that auth server is mounted (apps/start),
 * so tokens are verified against its published JWKS rather than in-process —
 * see `createMcpProtectedRequestHandler` below.
 *
 * Every tool that touches an organization goes through `assertMcpAccess`:
 * the token's consented scope AND the user's live team permission in that
 * org (`hasOrgPermission`, the same check the REST API and web UI use). A
 * connection can never do more than its user can.
 */
function buildMcpServer(claims: McpUserClaims | null): McpServer {
	const server = new McpServer({ name: "sayr", version: "1.0.0" });
	registerIdentityTools(server, claims);
	registerTaskTools(server, claims);
	registerCommentTools(server, claims);
	registerReferenceTools(server, claims);
	registerReleaseTools(server, claims);
	return server;
}

const mcpHandler = createMcpHandler((ctx) => buildMcpServer(claimsFromAuthInfo(ctx.authInfo)), { legacy: "reject" });

export const mcpFetchHandler = createMcpProtectedRequestHandler(
	{
		issuer: mcpOAuthConfig.issuer,
		audience: mcpOAuthConfig.resource,
		jwksUrl: mcpOAuthConfig.jwksUrl,
	},
	async (request, claims) => {
		const authInfo = {
			token: "",
			clientId: typeof claims.client_id === "string" ? claims.client_id : "",
			scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
			extra: { userId: claims.sub },
		};
		return mcpHandler.fetch(request, { authInfo });
	}
);

/**
 * RFC 9728 protected-resource metadata for `mcpOAuthConfig.resource`. Not
 * served automatically the way it would be if the resource and authorization
 * server were the same process (the mcp() plugin's own doc) — apps/backend is
 * a separate resource server that only verifies tokens via JWKS, so it has to
 * publish this itself. The WWW-Authenticate challenge on an unauthenticated
 * /mcp request points here.
 */
export function mcpProtectedResourceMetadata(): Response {
	return Response.json({
		resource: mcpOAuthConfig.resource,
		authorization_servers: [mcpOAuthConfig.issuer],
		jwks_uri: mcpOAuthConfig.jwksUrl,
		bearer_methods_supported: ["header"],
		resource_name: "Sayr",
	});
}
