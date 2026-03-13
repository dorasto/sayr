import * as schema from "@repo/database";
import { db } from "@repo/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, genericOAuth, twoFactor } from "better-auth/plugins";
import {
	polar,
	checkout,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { validateEvent } from '@polar-sh/sdk/webhooks'
import { Subscription } from "@polar-sh/sdk/models/components/subscription.js";
import { CustomerSeat } from "@polar-sh/sdk/models/components/customerseat.js";
import { getEditionCapabilities, isSelfHosted } from "@repo/edition";
import { eq, sql } from "drizzle-orm";
import { sendEmail } from "@repo/util";
export { Polar, validateEvent };
export type { Subscription, CustomerSeat };
const rootUrl = process.env.VITE_ROOT_DOMAIN;
const isProd = process.env.APP_ENV === "production";
// Auth callback URL for OAuth providers (must be consistent subdomain)
const authCallbackUrl = process.env.VITE_AUTH_CALLBACK_URL || process.env.VITE_URL_ROOT;
// Cookie domains need at least 2 parts (e.g., ".app.localhost" works, ".localhost" doesn't)
// For local dev with subdomains, use "app.localhost" pattern or sslip.io/nip.io
const isBarelocalhost = rootUrl === "localhost";
const { polarBillingEnabled, dorasOAuthEnabled } = getEditionCapabilities();

export const polarClient = polarBillingEnabled
	? new Polar({
		accessToken: process.env.POLAR_ACCESS_TOKEN,
	})
	: null;
const plugins: any[] = [
	apiKey({ enableMetadata: true, defaultPrefix: "api_", defaultKeyLength: 64 }),
	admin(),
	genericOAuth({
		config: [
			{
				disableSignUp: !dorasOAuthEnabled,
				providerId: "doras",
				clientId: process.env.DORAS_CLIENT_ID as string,
				clientSecret: process.env.DORAS_CLIENT_SECRET as string,
				authorizationUrl: "https://doras.to/oauth2/authorize",
				tokenUrl: "https://doras.to/oauth2/token",
				userInfoUrl: "https://doras.to/api/v1/account/me",
				scopes: ["identity,brands"],
				responseType: "code",
				authentication: "post",
				authorizationUrlParams: {
					redirect_to: "/",
				},
				redirectURI: `${authCallbackUrl}/api/auth/oauth2/callback/doras`,
				getUserInfo: async (tokens) => {
					if (tokens.accessToken) {
						const data = await DorasUser(tokens.accessToken);
						if (data?.error) {
							throw new Error(data.error);
						}
						const profile = data?.account;
						return profile;
					}
				},
				mapProfileToUser: async (profile) => {
					return {
						id: profile.id,
						email: profile.email,
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
		issuer: "sayr.io"
	})
]
if (polarBillingEnabled) {
	if (!process.env.POLAR_PRODUCT_ID) {
		throw new Error("POLAR_PRODUCT_ID is required for cloud edition");
	}

	if (!polarClient) {
		throw new Error("Polar client not initialized");
	}

	plugins.push(
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId: process.env.POLAR_PRODUCT_ID || "",
							slug: "sayr-pro" // Custom slug for easy reference in Checkout URL, e.g.
						}
					],
					successUrl: isProd ? "https://admin.sayr.io/success?checkout_id={CHECKOUT_ID}" : "http://admin.app.localhost:3000/success?checkout_id={CHECKOUT_ID}",
					authenticatedUsersOnly: true,
					returnUrl: isProd ? "https://admin.sayr.io/" : "http://admin.app.localhost:3000/",
				})
				,
			],
		})
	);
}
export const auth = betterAuth({
	appName: "sayr.io",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			...schema.auth,
			apikey: schema.schema.apikey,
			twoFactor: schema.auth.two_factor
		},
	}),
	trustedOrigins: [
		`http://${rootUrl}`,
		`http://${rootUrl}:3000`,
		`https://${rootUrl}`,
		// ✅ wildcard subdomains
		`https://*.${rootUrl}`,
		`http://*.${rootUrl}`,
		`http://*.${rootUrl}:3000`,
	],
	advanced: {
		// Enable cross-subdomain cookies for production and dev domains that support it
		// Disabled for bare "localhost" since browsers reject .localhost as cookie domain
		crossSubDomainCookies: {
			enabled: !isBarelocalhost,
			domain: `.${rootUrl}`,
		},
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
				polarClient && await polarClient.customers.deleteExternal({
					externalId: user.id,
				});
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
		sendVerificationEmail: async ({ user, url, token }, request) => {
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
	},
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
			redirectURI: `${authCallbackUrl}/api/auth/callback/github`,
			mapProfileToUser: async (profile) => {
				return {
					id: String(profile.id),
					email: profile.email ?? `${profile.id}@github.local`, // fallback
					name: profile.name ?? profile.login,
					displayName: profile.name ?? profile.login,
					image: profile.avatar_url,
					emailVerified: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			},
		},
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["github", "doras"],
			allowDifferentEmails: true,
		},
	},
	plugins: plugins,
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					// On self-hosted editions, automatically promote the first user to platform admin
					if (!isSelfHosted()) return;

					const result = await db
						.select({ count: sql<number>`count(*)::int` })
						.from(schema.auth.user);

					if (result[0]?.count === 1) {
						await db
							.update(schema.auth.user)
							.set({ role: "admin" })
							.where(eq(schema.auth.user.id, user.id));
						await db.insert(schema.auth.user).values({
							id: crypto.randomUUID(),
							name: "sayr",
							email: "",
							emailVerified: true,
							image: "https://files.sayr.io/sayr.webp",
							role: "system"
						})
					}
				},
			},
		},
	},
});
async function DorasUser(accessToken: string) {
	try {
		const response = await fetch("https://doras.to/api/v1/account/me", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		const account = await response.json();
		if (account?.id) {
			const responseOrgMember = await fetch(
				`https://doras.to/api/v1/account/me/brand/${process.env.DORAS_ORGANIZATION}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);
			const dataOrgMember = await responseOrgMember.json();
			if (dataOrgMember?.message) {
				return null;
			}
			if (dataOrgMember.id !== process.env.DORAS_ORGANIZATION) {
				return null;
			}
			return {
				account: account,
			};
		}
		return {
			error: "Token not found",
		};
		// biome-ignore lint/suspicious/noExplicitAny: <needed>
	} catch (error: any) {
		console.error("Error fetching token:", error);
		return {
			error: error.toString(),
		};
	}
}
