import { db, getOrganizations } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";
import { OrganizationMemberSchema, OrganizationSchema, PublicUserSchema } from "./schemas";

export const profileRoute = new Hono<AppEnv>();

/**
 * These two routes deliberately require no scope beyond a valid key — "who
 * am I" and "what orgs am I in" are read-only account-identity facts, not
 * task-level access, so they're not gated through `assertApiAccess`.
 */

profileRoute.get(
	"/",
	describeOkNotFound({
		summary: "Get User Info",
		description: "Retrieve information about the authenticated user.",
		dataSchema: PublicUserSchema,
		tags: ["User"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const user = await traceAsync(
			"me.public.fetch",
			() => db.query.user.findFirst({ where: (u) => eq(u.id, principal.userId) }),
			{
				description: "Fetching public user info",
				data: { userId: principal.userId },
				onSuccess: () => ({ outcome: "Public user info fetched" }),
			}
		);

		if (!user) {
			await recordWideError({
				name: "me.public.notfound",
				error: new Error("User not found"),
				code: "NOT_FOUND",
				message: "No user found for API key owner",
				contextData: { userId: principal.userId },
			});
			return c.json(errorResponse("No user found"), 404);
		}

		return c.json(
			successResponse({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				createdAt: user.createdAt.toISOString(),
			})
		);
	}
);

profileRoute.get(
	"/organizations",
	describeOkNotFound({
		summary: "Get Users Organizations",
		description: "Retrieve organizations associated with the authenticated user.",
		dataSchema: z.array(OrganizationSchema),
		tags: ["User"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const organizations = await traceAsync(
			"me.public.organizations.fetch",
			() => getOrganizations(principal.userId),
			{
				description: "Fetching user's organizations",
				data: { userId: principal.userId },
				onSuccess: () => ({ outcome: "User's organizations fetched" }),
			}
		);

		return c.json(
			successResponse(
				organizations.map((org) => {
					// biome-ignore lint/correctness/noUnusedVariables: destructured only to strip it from the response
					const { privateId, ...publicOrg } = org;
					return {
						...publicOrg,
						members: org.members.map((member) =>
							OrganizationMemberSchema.parse({
								id: member.id,
								userId: member.userId,
								organizationId: member.organizationId,
								createdAt: member.createdAt,
								user: {
									id: member.user.id,
									name: member.user.name,
									image: member.user.image,
									createdAt: member.user.createdAt,
								},
							})
						),
						eventsUrl: `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468/api` : `https://api.${process.env.VITE_ROOT_DOMAIN}`}/events?orgId=${publicOrg.id}&ref=publicApi`,
					};
				})
			)
		);
	}
);
