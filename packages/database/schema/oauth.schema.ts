import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { session, user } from "./auth";

// --------------------
// OAuth Client (better-auth oauth-provider / mcp plugin)
// --------------------
export const oauthClient = table(
	"oauth_client",
	{
		id: v.text("id").primaryKey(),
		clientId: v.text("client_id").notNull().unique(),
		clientSecret: v.text("client_secret"),
		clientDiscoveryId: v.text("client_discovery_id"),
		disabled: v
			.boolean("disabled")
			.$defaultFn(() => false),
		skipConsent: v.boolean("skip_consent"),
		enableEndSession: v.boolean("enable_end_session"),
		subjectType: v.text("subject_type"),
		scopes: v.text("scopes").array(),
		clientCredentialsScopes: v
			.text("client_credentials_scopes")
			.array()
			.$defaultFn(() => []),
		userId: v.text("user_id").references(() => user.id),
		createdAt: v.timestamp("created_at"),
		updatedAt: v.timestamp("updated_at"),
		name: v.text("name"),
		uri: v.text("uri"),
		icon: v.text("icon"),
		contacts: v.text("contacts").array(),
		tos: v.text("tos"),
		policy: v.text("policy"),
		softwareId: v.text("software_id"),
		softwareVersion: v.text("software_version"),
		softwareStatement: v.text("software_statement"),
		redirectUris: v.text("redirect_uris").array().notNull(),
		postLogoutRedirectUris: v.text("post_logout_redirect_uris").array(),
		backchannelLogoutUri: v.text("backchannel_logout_uri"),
		backchannelLogoutSessionRequired: v.boolean("backchannel_logout_session_required"),
		tokenEndpointAuthMethod: v.text("token_endpoint_auth_method"),
		applicationType: v.text("application_type"),
		jwks: v.text("jwks"),
		jwksUri: v.text("jwks_uri"),
		grantTypes: v.text("grant_types").array(),
		responseTypes: v.text("response_types").array(),
		requirePKCE: v.boolean("require_pkce"),
		dpopBoundAccessTokens: v
			.boolean("dpop_bound_access_tokens")
			.$defaultFn(() => false),
		referenceId: v.text("reference_id"),
		metadata: v.jsonb("metadata"),
	},
	(t) => [v.index("oauthClient_userId_idx").on(t.userId)]
);

// --------------------
// OAuth Resource (protected resource entity, e.g. the MCP server itself)
// --------------------
export const oauthResource = table("oauth_resource", {
	id: v.text("id").primaryKey(),
	identifier: v.text("identifier").notNull().unique(),
	name: v.text("name").notNull(),
	accessTokenTtl: v.integer("access_token_ttl"),
	refreshTokenTtl: v.integer("refresh_token_ttl"),
	signingAlgorithm: v.text("signing_algorithm"),
	signingKeyId: v.text("signing_key_id"),
	allowedScopes: v.text("allowed_scopes").array(),
	customClaims: v.jsonb("custom_claims"),
	dpopBoundAccessTokensRequired: v
		.boolean("dpop_bound_access_tokens_required")
		.$defaultFn(() => false),
	disabled: v
		.boolean("disabled")
		.$defaultFn(() => false),
	createdAt: v.timestamp("created_at"),
	updatedAt: v.timestamp("updated_at"),
	policyVersion: v
		.integer("policy_version")
		.$defaultFn(() => 1),
	metadata: v.jsonb("metadata"),
});

// --------------------
// OAuth Client <-> Resource join table
// --------------------
export const oauthClientResource = table(
	"oauth_client_resource",
	{
		id: v.text("id").primaryKey(),
		clientId: v
			.text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		resourceId: v
			.text("resource_id")
			.notNull()
			.references(() => oauthResource.identifier, { onDelete: "cascade" }),
		metadata: v.jsonb("metadata"),
		createdAt: v.timestamp("created_at"),
	},
	(t) => [
		v.index("oauthClientResource_clientId_idx").on(t.clientId),
		v.index("oauthClientResource_resourceId_idx").on(t.resourceId),
		v.uniqueIndex("oauthClientResource_clientId_resourceId_uidx").on(t.clientId, t.resourceId),
	]
);

// --------------------
// OAuth Refresh Token
// --------------------
export const oauthRefreshToken = table(
	"oauth_refresh_token",
	{
		id: v.text("id").primaryKey(),
		token: v.text("token").notNull().unique(),
		clientId: v
			.text("client_id")
			.notNull()
			.references(() => oauthClient.clientId),
		sessionId: v.text("session_id").references(() => session.id, { onDelete: "set null" }),
		userId: v
			.text("user_id")
			.notNull()
			.references(() => user.id),
		referenceId: v.text("reference_id"),
		authorizationCodeId: v.text("authorization_code_id"),
		resources: v.text("resources").array(),
		requestedUserInfoClaims: v.text("requested_user_info_claims").array(),
		expiresAt: v.timestamp("expires_at"),
		createdAt: v.timestamp("created_at"),
		revoked: v.timestamp("revoked"),
		rotatedAt: v.timestamp("rotated_at"),
		rotationReplayResponse: v.text("rotation_replay_response"),
		rotationReplayExpiresAt: v.timestamp("rotation_replay_expires_at"),
		authTime: v.timestamp("auth_time"),
		confirmation: v.jsonb("confirmation"),
		scopes: v.text("scopes").array().notNull(),
	},
	(t) => [
		v.index("oauthRefreshToken_clientId_idx").on(t.clientId),
		v.index("oauthRefreshToken_sessionId_idx").on(t.sessionId),
		v.index("oauthRefreshToken_userId_idx").on(t.userId),
		v.index("oauthRefreshToken_authorizationCodeId_idx").on(t.authorizationCodeId),
	]
);

// --------------------
// OAuth Access Token (opaque fallback; MCP's JWT-audience tokens are stateless
// and verified via JWKS, so this table stays largely unused for that flow)
// --------------------
export const oauthAccessToken = table(
	"oauth_access_token",
	{
		id: v.text("id").primaryKey(),
		token: v.text("token").unique(),
		clientId: v
			.text("client_id")
			.notNull()
			.references(() => oauthClient.clientId),
		sessionId: v.text("session_id").references(() => session.id, { onDelete: "set null" }),
		userId: v.text("user_id").references(() => user.id),
		referenceId: v.text("reference_id"),
		authorizationCodeId: v.text("authorization_code_id"),
		resources: v.text("resources").array(),
		requestedUserInfoClaims: v.text("requested_user_info_claims").array(),
		refreshId: v.text("refresh_id").references(() => oauthRefreshToken.id),
		expiresAt: v.timestamp("expires_at"),
		createdAt: v.timestamp("created_at"),
		revoked: v.timestamp("revoked"),
		confirmation: v.jsonb("confirmation"),
		scopes: v.text("scopes").array().notNull(),
	},
	(t) => [
		v.index("oauthAccessToken_clientId_idx").on(t.clientId),
		v.index("oauthAccessToken_sessionId_idx").on(t.sessionId),
		v.index("oauthAccessToken_userId_idx").on(t.userId),
		v.index("oauthAccessToken_authorizationCodeId_idx").on(t.authorizationCodeId),
		v.index("oauthAccessToken_refreshId_idx").on(t.refreshId),
	]
);

// --------------------
// OAuth Consent
// --------------------
export const oauthConsent = table(
	"oauth_consent",
	{
		id: v.text("id").primaryKey(),
		clientId: v
			.text("client_id")
			.notNull()
			.references(() => oauthClient.clientId),
		userId: v.text("user_id").references(() => user.id),
		referenceId: v.text("reference_id"),
		resources: v.text("resources").array(),
		requestedUserInfoClaims: v.text("requested_user_info_claims").array(),
		scopes: v.text("scopes").array().notNull(),
		createdAt: v.timestamp("created_at"),
		updatedAt: v.timestamp("updated_at"),
	},
	(t) => [
		v.index("oauthConsent_clientId_idx").on(t.clientId),
		v.index("oauthConsent_userId_idx").on(t.userId),
	]
);

// --------------------
// OAuth Client Assertion (single-use jti replay guard for private_key_jwt auth)
// --------------------
export const oauthClientAssertion = table("oauth_client_assertion", {
	id: v.text("id").primaryKey(),
	expiresAt: v.timestamp("expires_at").notNull(),
});
