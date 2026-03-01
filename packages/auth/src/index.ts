import * as schema from "@repo/database";
import { db } from "@repo/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, genericOAuth } from "better-auth/plugins";
import {
	polar,
	checkout,
	portal,
	usage,
	webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { eq } from "drizzle-orm";
const rootUrl = process.env.VITE_ROOT_DOMAIN;
const isProd = process.env.APP_ENV === "production";
// Auth callback URL for OAuth providers (must be consistent subdomain)
const authCallbackUrl = process.env.VITE_AUTH_CALLBACK_URL || process.env.VITE_URL_ROOT;
// Cookie domains need at least 2 parts (e.g., ".app.localhost" works, ".localhost" doesn't)
// For local dev with subdomains, use "app.localhost" pattern or sslip.io/nip.io
const isBarelocalhost = rootUrl === "localhost";
export const polarClient = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN,
});
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
				await polarClient.customers.deleteExternal({
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
	plugins: [
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
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId: process.env.POLAR_PRODUCT_ID || "",
							slug: "sayr-pro" // Custom slug for easy reference in Checkout URL, e.g. /checkout/Copy-of-Sayr-Pro-for-testing
						}
					],
					successUrl: isProd ? "https://admin.sayr.io/success?checkout_id={CHECKOUT_ID}" : "http://admin.app.localhost:3000/success?checkout_id={CHECKOUT_ID}",
					authenticatedUsersOnly: true,
					returnUrl: isProd ? "https://admin.sayr.io/" : "http://admin.app.localhost:3000/",
				})
				,
				webhooks({
					secret: process.env.POLAR_WEBHOOK_SECRET as string,

					async onSubscriptionCreated({ data }) {
						const orgId = data.customer.externalId;
						if (!orgId) return;

						const isActive =
							data.status === "active" ||
							data.status === "trialing";

						await db.update(schema.schema.organization)
							.set({
								plan: isActive ? "pro" : "free",
								seatCount: data.seats ?? 1,
								polarCustomerId: data.customerId,
								polarSubscriptionId: data.id,
								currentPeriodEnd: data.currentPeriodEnd,
							})
							.where(eq(schema.schema.organization.id, orgId));


						if (data.metadata?.firstUserId) {
							await polarClient.customerSeats.assignSeat({
								subscriptionId: data.id,
								externalCustomerId: data.metadata.firstUserId as any,
								immediateClaim: true,
								metadata: {
									userId: data.metadata.firstUserId as any,
									organizationId: orgId,
									action: "initial_seat_assignment",
								}
							});
						}

						console.log("✅ Subscription created:", orgId);
					},

					async onSubscriptionUpdated({ data }) {
						const orgId = data.customer.externalId;
						if (!orgId) return;

						const isActive =
							data.status === "active" ||
							data.status === "trialing";

						await db.update(schema.schema.organization)
							.set({
								plan: isActive ? "pro" : "free",
								seatCount: data.seats ?? 1,
								currentPeriodEnd: data.currentPeriodEnd,
							})
							.where(eq(schema.schema.organization.id, orgId));

						console.log("🔄 Subscription updated:", orgId);
					},

					async onSubscriptionCanceled({ data }) {
						const orgId = data.customer.externalId;
						if (!orgId) return;

						await db.update(schema.schema.organization)
							.set({
								plan: "free",
								seatCount: 5,
							})
							.where(eq(schema.schema.organization.id, orgId));

						console.log("❌ Subscription canceled:", orgId);
					},
				})
			],
		})
	],
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
