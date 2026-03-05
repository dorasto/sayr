import * as schema from "@repo/database";
import { db } from "@repo/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, genericOAuth } from "better-auth/plugins";
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
export { Polar, validateEvent };
export type { Subscription, CustomerSeat };
const rootUrl = process.env.VITE_ROOT_DOMAIN;
const isProd = process.env.APP_ENV === "production";
// Auth callback URL for OAuth providers (must be consistent subdomain)
const authCallbackUrl = process.env.VITE_AUTH_CALLBACK_URL || process.env.VITE_URL_ROOT;
// Cookie domains need at least 2 parts (e.g., ".app.localhost" works, ".localhost" doesn't)
// For local dev with subdomains, use "app.localhost" pattern or sslip.io/nip.io
const isBarelocalhost = rootUrl === "localhost";
const { polarBillingEnabled } = getEditionCapabilities();

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
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			...schema.auth,
			apikey: schema.schema.apikey,
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
		enabled: false,
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
