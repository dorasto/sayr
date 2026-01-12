import * as schema from "@repo/database";
import { db } from "@repo/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, genericOAuth } from "better-auth/plugins";
const rootUrl = process.env.VITE_ROOT_DOMAIN;
const isProd = process.env.APP_ENV === "production";
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema.auth,
	}),
	trustedOrigins: [
		`https://${rootUrl}`,
		// ✅ wildcard subdomains
		`https://*.${rootUrl}`,
	],
	advanced: {
		crossSubDomainCookies: {
			enabled: isProd,
			domain: `.${rootUrl}`,
		},
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				input: false,
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
			redirectURI: `${process.env.VITE_URL_ROOT}/api/auth/callback/github`,
			mapProfileToUser: async (profile) => {
				return {
					id: String(profile.id),
					email: profile.email ?? `${profile.id}@github.local`, // fallback
					name: profile.name ?? profile.login,
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
					redirectURI: `${process.env.VITE_URL_ROOT}/api/auth/oauth2/callback/doras`,
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
							emailVerified: true,
							createdAt: new Date(),
							updatedAt: new Date(),
							image: profile.pic,
						};
					},
				},
			],
		}),
	],
});
console.log("🚀 ~ auth:", auth.options)

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
