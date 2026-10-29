import { auth } from "@repo/auth";
import { db, schema } from "@repo/database";
import { isCloud } from "@repo/edition";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, isNull } from "drizzle-orm";

// Apps (MCP clients) the signed-in user has authorized through the OAuth consent screen. Cloud-only, like the MCP
// server itself. Every function reads the user from the request's session, never from its input.

async function requireSessionUser() {
	const session = await auth.api.getSession({ headers: new Headers(getRequestHeaders()) });
	if (!session?.user) throw new Error("Not signed in");
	return session.user;
}

export type ConnectedApp = {
	id: string;
	clientId: string;
	name: string | null;
	uri: string | null;
	scopes: string[];
	connectedAt: Date | null;
};

export const getConnectedApps = createServerFn({ method: "GET" }).handler(async (): Promise<ConnectedApp[]> => {
	if (!isCloud()) return [];
	const user = await requireSessionUser();
	return db
		.select({
			id: schema.oauthConsent.id,
			clientId: schema.oauthConsent.clientId,
			name: schema.oauthClient.name,
			uri: schema.oauthClient.uri,
			scopes: schema.oauthConsent.scopes,
			connectedAt: schema.oauthConsent.createdAt,
		})
		.from(schema.oauthConsent)
		.leftJoin(schema.oauthClient, eq(schema.oauthClient.clientId, schema.oauthConsent.clientId))
		.where(eq(schema.oauthConsent.userId, user.id));
});

/**
 * better-auth's own delete-consent endpoint only removes the consent row: the app's refresh tokens keep working, so
 * it could mint new access tokens forever. Revoking here also revokes every refresh token the app holds for this
 * user; the MCP server rejects access tokens without a live consent, so already-issued ones stop working at once.
 */
export const revokeConnectedApp = createServerFn({ method: "POST" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const user = await requireSessionUser();
		const consent = await db.query.oauthConsent.findFirst({
			where: and(eq(schema.oauthConsent.id, data.id), eq(schema.oauthConsent.userId, user.id)),
		});
		if (!consent) throw new Error("Connected app not found");

		await db.transaction(async (tx) => {
			await tx
				.delete(schema.oauthConsent)
				.where(and(eq(schema.oauthConsent.userId, user.id), eq(schema.oauthConsent.clientId, consent.clientId)));
			await tx
				.update(schema.oauthRefreshToken)
				.set({ revoked: new Date() })
				.where(
					and(
						eq(schema.oauthRefreshToken.userId, user.id),
						eq(schema.oauthRefreshToken.clientId, consent.clientId),
						isNull(schema.oauthRefreshToken.revoked)
					)
				);
		});
		return { ok: true };
	});
