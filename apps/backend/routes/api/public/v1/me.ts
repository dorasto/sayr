import {
    db,
    auth as authSchema,
    getOrganizations,
    schema,
    createTask,
    addLogEventTask,
    getTaskById,
    getOrganizationMembers,
} from "@repo/database";
import { markdownToProsekitJSON } from "@/prosekit/parser";
import { and, eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { describeOkNotFound } from "../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../responses";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { auth } from "@repo/auth";
import { ServerEventBaseMessage } from "@/routes/events/types";
import { findSSEClientsByUserId, sseBroadcastIndividual, sseBroadcastPublic, sseBroadcastToRoom } from "@/routes/events";
import { traceOrgPermissionCheck } from "@/util";
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

export const CreateTaskSchema = {
    type: "object",
    required: ["title", "orgId"],
    properties: {
        title: { type: "string", minLength: 1 },
        description: { type: "string" },
        status: {
            type: "string",
            enum: ["backlog", "todo", "in-progress", "done", "canceled"]
        },
        priority: {
            type: "string",
            enum: ["none", "low", "medium", "high", "urgent"]
        },
        category: { type: "string" },
        orgId: { type: "string" },

        integration: {
            oneOf: [
                {
                    type: "object",
                    required: ["id", "name", "platform"],
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        platform: {
                            type: "string",
                        }
                    }
                },
                { type: "null" }
            ]
        },

        CreatedBy: {
            oneOf: [
                {
                    type: "object",
                    required: ["type", "userId"],
                    properties: {
                        type: {
                            type: "string",
                            enum: ["github", "doras", "discord", "slack"]
                        },
                        userId: { type: "string" },
                        name: { type: "string" }
                    }
                },
                { type: "null" }
            ]
        }
    }
};

const CreateTaskSchemaData = z.object({
    id: z.string(),
    title: z.string(),
    shortId: z.string(),
    orgSlug: z.string(),
    publicPortalUrl: z.string(),
});


Route.post(
    "/task",
    describeOkNotFound({
        summary: "Create Task",
        description: "Create a new task in the organization.",
        dataSchema: CreateTaskSchemaData,
        bodySchema: CreateTaskSchema,
        bodyExample: {
            title: "My Task",
            description: "Task description",
            orgId: "abc123",
        },
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
    }),
    async (c) => {
        const traceAsync = createTraceAsync();

        const authHeader = c.req.header("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

        if (!token) {
            return c.json(errorResponse("Unauthorized", "No authorization header provided"), 401);
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
            return c.json(errorResponse("Invalid API key", "The provided API key is invalid or disabled"), 401);
        }
        let userId = apiKeyResult.key?.userId;

        const body = await c.req.json();
        const { orgId, title, description, status, priority, category, integration, createdBy } = body;

        const allowed = ["github", "doras", "discord", "slack"] as const;

        if (createdBy) {
            const provider = createdBy.type;
            const providerId = createdBy.userId;

            if (!allowed.includes(provider)) {
                return c.json(
                    {
                        success: false,
                        error: "Invalid CreatedBy type",
                        message: "The provided CreatedBy type is invalid",
                    },
                    400
                );
            }

            if (providerId) {
                const account = await db.query.account.findFirst({
                    where: and(
                        eq(authSchema.account.accountId, providerId),
                        eq(authSchema.account.providerId, provider)
                    ),
                });

                if (account) {
                    userId = account.userId;
                }
            }
        }

        const isAuthorized = await traceOrgPermissionCheck(apiKeyResult.key.userId || "", orgId, "tasks.create");

        if (!isAuthorized) {
            return c.json({ success: false, error: "You don't have permission to create tasks.", message: "You are not authorized to create tasks in this organization." }, 401);
        }

        const descriptionProsekit = description ? markdownToProsekitJSON(description) : undefined;
        const task = await traceAsync(
            "task.create.insert",
            () => createTask(orgId, {
                title,
                description: descriptionProsekit,
                status: status,
                priority: priority,
                category: category,
                releaseId: null,
                visible: "public",
                parentId: null,
            }, userId || undefined),
            {
                description: "Creating task record",
                data: { orgId, title, status, priority, category },
            }
        );

        if (!task) {
            return c.json({ success: false, error: "Failed to create task", message: "An error occurred while creating the task" }, 500);
        }

        // Add integration timeline event first if integration info provided
        if (integration) {
            await traceAsync(
                "task.create.timeline.integration",
                () => addLogEventTask(
                    task.id,
                    orgId,
                    "integration",
                    null,
                    { ...integration, createdBy },
                    userId || undefined,
                ),
                {
                    description: "Adding integration timeline event",
                }
            );
        }

        // Add created timeline event
        await traceAsync(
            "task.create.timeline",
            () => addLogEventTask(
                task.id,
                orgId,
                "created",
                null,
                { status, priority, title, labels: [], assignees: [] },
                userId || undefined,
                descriptionProsekit
            ),
            {
                description: "Adding created timeline event",
            }
        );
        const taskWithData = await traceAsync("task.me.refetch", () => getTaskById(orgId, task.id), {
            description: "Fetching created public task with relations",
        });
        await traceAsync(
            "task.public_create.broadcast",
            async () => {
                const data = {
                    type: "CREATE_TASK" as ServerEventBaseMessage["type"],
                    data: taskWithData,
                };

                sseBroadcastToRoom(orgId, "tasks", data);
                sseBroadcastPublic(orgId, { ...data, data: data });

                const members = await getOrganizationMembers(orgId);
                members.forEach((member) => {
                    const clients = findSSEClientsByUserId(member.userId);
                    clients.forEach(
                        (client) =>
                            client.channel !== "tasks" && sseBroadcastIndividual(client, data, orgId)
                    );
                });
            },
            { description: "Broadcasting new public task to clients" }
        );
        const organization = await db.query.organization.findFirst({
            columns: {
                id: true,
                slug: true
            }, where: (org) => eq(org.id, orgId),
        });
        return c.json(
            successResponse({
                id: task.id,
                shortId: task.shortId,
                title: task.title,
                orgSlug: organization?.slug,
                publicPortalUrl: `${process.env.APP_ENV === "development" ? `http://${organization?.slug}.${process.env.VITE_ROOT_DOMAIN}:3000` : `https://${organization?.slug}.${process.env.VITE_ROOT_DOMAIN}`}/${task.shortId}`
            })
        );
    }
);