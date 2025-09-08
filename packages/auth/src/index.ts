import * as schema from "@repo/database";
import { db } from "@repo/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, genericOAuth, organization } from "better-auth/plugins";
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema.auth,
	}),
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
	plugins: [
		organization({
			schema: {
				organization: {
					additionalFields: {
						bannerImg: {
							type: "string",
							input: true,
							required: false,
						},
						description: {
							type: "string",
							input: true,
							required: false,
						},
					},
				},
			},
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
						redirect_to: process.env.NEXT_PUBLIC_URL_ROOT as string,
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
					overrideUserInfo: true,
				},
			],
		}),
	],
});
