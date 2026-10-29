import * as schema from "@repo/database";
import { db } from "@repo/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, genericOAuth, jwt, lastLoginMethod, twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { polar, checkout } from "@polar-sh/better-auth";
import { createPolar } from "@polar-sh/sdk/2026-10";
import { mcp } from "@better-auth/mcp";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { DEFAULT_OAUTH_SCOPES } from "@better-auth/oauth-provider";
import { getEditionCapabilities, isCloud, isSelfHosted } from "@repo/edition";
import { eq, sql } from "drizzle-orm";
import { ALL_API_KEY_SCOPES, sendEmail } from "@repo/util";
import { addContactToContactBook, deleteContactByEmail } from "@repo/util/email";
import { apiKey } from "@better-auth/api-key";
import { getSessionCookie } from "better-auth/cookies";
export { getSessionCookie };

const rootUrl = process.env.VITE_ROOT_DOMAIN;
const isProd = process.env.APP_ENV === "production";
// Auth callback URL for OAuth providers (must be consistent subdomain)
const authCallbackUrl = process.env.VITE_AUTH_CALLBACK_URL || process.env.VITE_URL_ROOT;
// Cookie domains need at least 2 parts (e.g., ".app.localhost" works, ".localhost" doesn't)
// For local dev with subdomains, use "app.localhost" pattern or sslip.io/nip.io
const isBarelocalhost = rootUrl === "localhost";
const { polarBillingEnabled } = getEditionCapabilities();
// MCP server access is cloud-only (SAY-31). The canonical protected-resource identifier
// must be HTTPS except on loopback hosts, so dev falls back to the bare backend origin.
// @better-auth/mcp's own resource validator is stricter than the general
// loopback check elsewhere in this file: HTTP is only accepted for the literal
// hostname "localhost" (confirmed by reading its source), not any *.localhost
// subdomain. So dev can't go through the api.<root> virtual host the way prod
// does — apps/backend registers this route at both its bare root (for this,
// dev's unrewritten localhost:5468 traffic) and under /api/public (for prod's
// api.<root> traffic, which always gets rewritten there). See routes/mcp.
const mcpResource = isProd ? `https://api.${rootUrl}/mcp` : "http://localhost:5468/mcp";
// Matches the `iss` claim the jwt() plugin actually signs: better-auth's own
// baseURL (unset in dev, inferred from the request origin) appended with its
// default `/api/auth` basePath. `authCallbackUrl` is the same "where the auth
// handler lives" origin every redirect URI above already assumes in dev.
const mcpIssuer = `${isProd ? `https://${rootUrl}` : authCallbackUrl}/api/auth`;
const mcpJwksUrl = `${mcpIssuer}/jwks`;
// The OAuth login/consent pages live in the admin app, but in prod the auth server is the bare root
// domain, which serves the marketing site — relative page paths would 404 there.
const mcpPagesOrigin = isProd ? `https://admin.${rootUrl}` : authCallbackUrl;
/**
 * Exported so apps/backend's separate-process MCP resource-server route
 * (SAY-31) can verify tokens against the exact same issuer/resource this
 * config issues them for — these must never be independently recomputed from
 * env vars elsewhere, or they will silently drift apart.
 */
export const mcpOAuthConfig = { resource: mcpResource, issuer: mcpIssuer, jwksUrl: mcpJwksUrl };

// Hosts that serve user-uploaded content. They're subdomains of root (so matched by the
// `*.root` wildcard) but must never be trusted as an auth origin.
const filesHosts = new Set<string>([`files.${rootUrl}`]);
try {
	const cdnHost = process.env.FILE_CDN ? new URL(process.env.FILE_CDN).hostname.toLowerCase() : "";
	if (cdnHost && cdnHost !== rootUrl) filesHosts.add(cdnHost);
} catch {
	// FILE_CDN may be unset or not an absolute URL in some setups; ignore.
}

function isFilesHostOrigin(value: string | null | undefined): boolean {
	if (!value) return false;
	try {
		return filesHosts.has(new URL(value).hostname.toLowerCase());
	} catch {
		return false;
	}
}

const polarClient = polarBillingEnabled
	? createPolar({
			accessToken: process.env.POLAR_ACCESS_TOKEN!,
		})
	: null;
const plugins = [
	lastLoginMethod({
		storeInDatabase: true,
	}),
	apiKey({
		configId: "default",
		enableMetadata: true,
		defaultPrefix: "api_",
		defaultKeyLength: 64,
		// The plugin's built-in fallback is 10 requests per 24h, which is unusable for a
		// real API key. Set an explicit default so keys created without an override get a
		// sane budget. Note the window is idle-reset, not rolling: the counter only resets
		// after `timeWindow` of silence, so this means "120 requests, then blocked until a
		// quiet minute". Per-key values passed to createApiKey still take precedence, so
		// the console's system keys (rateLimitEnabled: false) are unaffected.
		rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 },
	}),
	admin(),
	genericOAuth({
		config: [
			{
				providerId: "doras",
				clientId: process.env.DORAS_CLIENT_ID as string,
				clientSecret: process.env.DORAS_CLIENT_SECRET as string,
				authorizationUrl: "https://doras.to/oauth2/authorize",
				tokenUrl: "https://doras.to/oauth2/token",
				userInfoUrl: "https://doras.to/api/v1/account/me",
				scopes: ["identity"],
				responseType: "code",
				authentication: "post",
				authorizationUrlParams: {
					redirect_to: "/",
				},
				redirectURI: `${authCallbackUrl}/api/auth/callback/doras`,
				//@ts-ignore
				mapProfileToUser: async (profile) => {
					return {
						id: profile.id,
						email: profile.email ?? `${profile.id}@doras.local`, // fallback
						name: profile.username,
						displayName: profile.displayName ?? profile.username,
						emailVerified: true,
						createdAt: new Date(),
						updatedAt: new Date(),
						image: profile.pic,
					};
				},
			},
		],
	}),
	twoFactor({
		issuer: "sayr.io",
	}),
	passkey({
		rpID: rootUrl || "localhost",
		rpName: "sayr.io",
	}),
	// MCP server access (SAY-31) is cloud-only — self-hosted editions don't get the
	// OAuth authorization-server endpoints at all, not just a feature gate on top.
	...(isCloud()
		? [
				// Only the MCP access tokens need signing. Without this, every getSession — including
				// apps/backend's, on every API request — signs a throwaway `set-auth-jwt` header.
				jwt({ disableSettingJwtHeader: true }),
				mcp({
					loginPage: `${mcpPagesOrigin}/auth/login`,
					consentPage: `${mcpPagesOrigin}/auth/consent`,
					resource: mcpResource,
					// Reuse the personal-API-key scope vocabulary (tasks.read, tasks.create, ...)
					// rather than inventing a parallel one for MCP tokens.
					scopes: [...DEFAULT_OAUTH_SCOPES, ...ALL_API_KEY_SCOPES],
					// No client_credentials: every MCP token must belong to a signed-in user, so
					// it can be held to that user's own team permissions in each org.
					grantTypes: ["authorization_code", "refresh_token"],
				}),
				cimd({
					fetchClientMetadataResource,
					metadataProfile: "mcp-2026-07-28",
				}),
			]
		: []),
];

export const auth = betterAuth({
	appName: "sayr.io",
	// Left undefined in dev pre-SAY-31, relying on better-auth inferring it per-request.
	// The oauth-provider plugin needs a real URL at init time (before any request exists)
	// to validate the issuer, so this now matches authCallbackUrl — the same origin every
	// redirect URI above already assumes in dev — instead of crashing on an empty string.
	baseURL: process.env.BETTER_AUTH_URL || (isProd ? `https://${rootUrl}` : authCallbackUrl),
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			...schema.auth,
			apikey: schema.schema.apikey,
			twoFactor: schema.auth.two_factor,
			passkey: schema.auth.passkey,
			oauthClient: schema.schema.oauthClient,
			oauthResource: schema.schema.oauthResource,
			oauthClientResource: schema.schema.oauthClientResource,
			oauthRefreshToken: schema.schema.oauthRefreshToken,
			oauthAccessToken: schema.schema.oauthAccessToken,
			oauthConsent: schema.schema.oauthConsent,
			oauthClientAssertion: schema.schema.oauthClientAssertion,
			jwks: schema.schema.jwks,
		},
	}),
	// Org portals live on `<slug>.<root>`, so subdomains must be trusted by wildcard. The user-content
	// files host is also a subdomain of root, and Better Auth's wildcard syntax can't express an
	// exclusion — so when a request originates from a files host, drop the wildcards for that request.
	trustedOrigins: (request) => {
		const explicit = [`http://${rootUrl}`, `http://${rootUrl}:3000`, `https://${rootUrl}`];
		const wildcards = [`https://*.${rootUrl}`, `http://*.${rootUrl}`, `http://*.${rootUrl}:3000`];
		const source = request?.headers.get("origin") || request?.headers.get("referer");
		return isFilesHostOrigin(source) ? explicit : [...explicit, ...wildcards];
	},
	advanced: {
		// Enable cross-subdomain cookies for production and dev domains that support it
		// Disabled for bare "localhost" since browsers reject .localhost as cookie domain
		crossSubDomainCookies: {
			enabled: !isBarelocalhost,
			domain: `.${rootUrl}`,
		},
		// Force __Secure- prefixed cookies in production so that session validation
		// works behind reverse proxies that terminate TLS (e.g. Zerops, Coolify).
		// Without this, Better Auth sees the internal http:// request and looks for
		// non-prefixed cookie names, missing the __Secure- cookies the browser sends.
		useSecureCookies: isProd,
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				input: false,
			},
			displayName: {
				type: "string",
				input: true,
			},
		},
		deleteUser: {
			enabled: true,
			afterDelete: async (user, request) => {
				if (isCloud()) {
					await deleteContactByEmail(user.email);
				}
				polarClient &&
					(await polarClient.customers.deleteExternal(user.id).catch((err) => {
						console.error("[polar] Failed to delete external customer:", err);
					}));
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url, token }, request) => {
			void sendEmail({
				to: user.email,
				subject: "Reset your password",
				text: `Click the link to reset your password: ${url}`,
			});
		},
	},
	emailVerification: {
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			// Absolute, like the password reset link: a relative callback resolves against the auth base URL (the bare
			// root domain in production), not the app.
			url = url.replace(
				"&callbackURL=%2F",
				`&callbackURL=${encodeURIComponent(`${process.env.VITE_URL_ROOT}/auth/auth-check`)}`
			);
			void sendEmail({
				to: user.email,
				subject: "Verify your email address",
				html: `
					<!DOCTYPE html>
					<html>
					<head>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
					</head>
					<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
						<h1 style="color: #1a1a1a; margin-bottom: 24px;">Verify your email address</h1>
						<p style="margin-bottom: 16px;">Thanks for signing up! Please verify your email address by clicking the button below:</p>
						<div style="text-align: center; margin: 32px 0;">
							<a href="${url}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Verify Email</a>
						</div>
						<p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
						<p style="color: #2563eb; word-break: break-all; font-size: 14px;">${url}</p>
						<p style="color: #666; font-size: 14px; margin-top: 32px;">This link will expire in 24 hours.</p>
					</body>
					</html>
				`,
			});
		},
		onExistingUserSignUp: async (ctx: any) => {
			ctx.user;
			void sendEmail({
				to: ctx.user.email,
				subject: "Sign-up attempt with your email",
				text: "Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.",
			});
		},
	},
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
			redirectURI: `${authCallbackUrl}/api/auth/callback/github`,
			scope: ["user:email"],
			mapProfileToUser: (profile) => ({
				email: profile.email ?? `${profile.id}@github.local`, // fallback
				name: profile.name.toLowerCase() ?? profile.login.toLowerCase(),
				displayName: profile.name ?? profile.login,
				image: profile.avatar_url,
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		},
		discord: {
			clientId: process.env.DISCORD_CLIENT_ID as string,
			clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
			redirectURI: `${authCallbackUrl}/api/auth/callback/discord`,
			mapProfileToUser: (profile) => ({
				name: profile.username.toLowerCase(),
				displayName: profile.username,
			}),
		},
		slack: {
			clientId: process.env.SLACK_CLIENT_ID as string,
			clientSecret: process.env.SLACK_CLIENT_SECRET as string,
			redirectURI: `${authCallbackUrl}/api/auth/callback/slack`,
			mapProfileToUser: (profile) => ({
				displayName: profile.name,
				name: profile.name.toLowerCase(),
			}),
		},
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["github", "doras", "discord", "slack"],
			allowDifferentEmails: true,
		},
	},
	plugins: plugins,
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					if (isCloud()) {
						if (user.emailVerified) {
							await addContactToContactBook({
								email: user.email,
								firstName: user.name,
								properties: {
									user_id: user.id,
								},
							});
						}
					}
					// Emit user.registered event to ClickHouse (cloud only, fire-and-forget)
					if (getEditionCapabilities().clickhouseEnabled) {
						const chUrl = process.env.CLICKHOUSE_URL;
						const chUser = process.env.CLICKHOUSE_USER;
						const chPassword = process.env.CLICKHOUSE_PASSWORD;
						const chDb = process.env.CLICKHOUSE_DB;
						if (chUrl && chUser && chPassword && chDb) {
							const row = JSON.stringify({
								event_type: "user.registered",
								actor_id: user.id,
								target_id: user.id,
								org_id: "",
								metadata: "{}",
							});
							fetch(
								`${chUrl}/?database=${chDb}&query=${encodeURIComponent(`INSERT INTO platform_events FORMAT JSONEachRow`)}`,
								{
									method: "POST",
									headers: {
										"X-ClickHouse-User": chUser,
										"X-ClickHouse-Key": chPassword,
										"Content-Type": "application/json",
									},
									body: row,
								}
							).catch((err) => {
								console.error("[clickhouse] Failed to emit user.registered:", err);
							});
						}
					}

					// On self-hosted editions, automatically promote the first user to platform admin
					if (!isSelfHosted()) return;

					const result = await db.select({ count: sql<number>`count(*)::int` }).from(schema.auth.user);

					if (result[0]?.count === 1) {
						await db.update(schema.auth.user).set({ role: "admin" }).where(eq(schema.auth.user.id, user.id));
						await db.insert(schema.auth.user).values({
							id: crypto.randomUUID(),
							name: "sayr",
							email: "",
							emailVerified: true,
							image: "https://files.sayr.io/sayr.webp",
							role: "system",
						});
					}
				},
			},
			update: {
				after: async (user, ctx) => {
					if (isCloud()) {
						if (user.emailVerified) {
							await addContactToContactBook({
								email: user.email,
								firstName: user.name,
								properties: {
									user_id: user.id,
								},
							});
						}
					}
				},
			},
		},
	},
});
