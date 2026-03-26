import {
    db,
    auth as authSchema,
    getOrganizations,
    schema,
} from "@repo/database";
import { eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { describeOkNotFound } from "../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../responses";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { auth } from "@repo/auth";
export const Route = new Hono<AppEnv>();
/**
 * Public user inside organization member
 */
const OrganizationMemberUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().nullable(),
    createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
});

/**
 * Organization member
 */
const OrganizationMemberSchema = z.object({
    id: z.string(),
    userId: z.string(),
    organizationId: z.string(),
    createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
    user: OrganizationMemberUserSchema,
});

//@ts-expect-error
const OrganizationSchema = createSelectSchema(schema.organization)
    .omit({ privateId: true, isSystemOrg: true, createdBy: true, polarCustomerId: true, polarSubscriptionId: true, seatCount: true, currentPeriodEnd: true })
    .extend({
        createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
        updatedAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
        eventsUrl: z.string(),
        members: z.array(OrganizationMemberSchema),
    });
//@ts-expect-error
const PublicUserSchema = createSelectSchema(authSchema.user)
    .pick({
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
    })
    .extend({
        createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
    });
Route.get(
    "/",
    describeOkNotFound({
        summary: "Get User Info",
        description: "Retrieve information about the authenticated user.",
        dataSchema: PublicUserSchema,
        tags: ["User"],
        security: [{ bearerAuth: [] }],
    }),
    async (c) => {
        const traceAsync = createTraceAsync();
        const recordWideError = c.get("recordWideError");

        const authHeader = c.req.header("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

        if (!token) {
            return c.json(errorResponse("Unauthorized"), 401);
        }

        const apiKeyResult = await traceAsync(
            "auth.apikey.verify",
            () =>
                auth.api.verifyApiKey({
                    body: {
                        key: token,
                    },
                }),
            {
                description: "Verifying API key",
                onSuccess: () => ({
                    outcome: "API key verified",
                }),
            }
        );

        if (!apiKeyResult?.valid || !apiKeyResult.key || !apiKeyResult.key.enabled || !apiKeyResult.key.userId) {
            return c.json(errorResponse("Invalid API key"), 401);
        }

        const user = await traceAsync(
            "me.public.fetch",
            () =>
                db.query.user.findFirst({
                    where: (u) => eq(u.id, apiKeyResult.key?.userId || ""),
                }),
            {
                description: "Fetching public user info",
                data: { userId: apiKeyResult.key.userId },
                onSuccess: () => ({
                    outcome: "Public user info fetched",
                }),
            }
        );

        if (!user) {
            await recordWideError({
                name: "me.public.notfound",
                error: new Error("User not found"),
                code: "NOT_FOUND",
                message: "No user found for API key owner",
                contextData: {
                    userId: apiKeyResult.key.userId,
                },
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

Route.get(
    "/organizations",
    describeOkNotFound({
        summary: "Get Users Organizations",
        description: "Retrieve organizations associated with the authenticated user.",
        dataSchema: z.array(OrganizationSchema),
        tags: ["User"],
        security: [{ bearerAuth: [] }],
    }),
    async (c) => {
        const traceAsync = createTraceAsync();

        const authHeader = c.req.header("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

        if (!token) {
            return c.json(errorResponse("Unauthorized"), 401);
        }

        const apiKeyResult = await traceAsync(
            "auth.apikey.verify",
            () =>
                auth.api.verifyApiKey({
                    body: {
                        key: token,
                    },
                }),
            {
                description: "Verifying API key",
                onSuccess: () => ({
                    outcome: "API key verified",
                }),
            }
        );

        if (!apiKeyResult?.valid || !apiKeyResult.key || !apiKeyResult.key.enabled || !apiKeyResult.key.userId) {
            return c.json(errorResponse("Invalid API key"), 401);
        }

        const organizations = await traceAsync(
            "me.public.organizations.fetch",
            () => getOrganizations(apiKeyResult.key?.userId || ""),
            {
                description: "Fetching user's organizations",
                data: { userId: apiKeyResult.key.userId },
                onSuccess: () => ({
                    outcome: "User's organizations fetched",
                }),
            }
        );

        return c.json(
            successResponse(
                organizations.map((org) => {
                    const { privateId, ...publicOrg } = org;
                    return {
                        ...publicOrg,
                        members: org.members.map((member) => ({
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
                        })),
                        eventsUrl: `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468/api` : `https://api.${process.env.VITE_ROOT_DOMAIN}`}/events?orgId=${publicOrg.id}&ref=publicApi`,
                    };
                })
            )
        );
    }
);