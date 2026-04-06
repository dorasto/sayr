import {
    db,
    auth as authSchema,
    getOrganizations,
    schema,
    createTask,
    addLogEventTask,
    getTaskById,
    getOrganizationMembers,
    createComment,
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

async function resolveCreatedBy(createdBy: {
    type: "github" | "doras" | "discord" | "slack";
    userId: string;
    name?: string;
    profileUrl?: string;
}) {
    const allowed = ["github", "doras", "discord", "slack"];

    if (!createdBy) {
        return null
    }

    const provider = createdBy.type;
    const providerId = createdBy.userId;

    if (!allowed.includes(provider)) {
        return null
    }

    if (!providerId) {
        return null
    }

    const account = await db.query.account.findFirst({
        where: and(
            eq(authSchema.account.accountId, providerId),
            eq(authSchema.account.providerId, provider)
        )
    });

    return account ? account.userId : null
}
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

        createdBy: {
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

const CreateTimelineEventSchema = {
    type: "object",
    required: ["taskId", "orgId", "type", "id", "name"],
    properties: {
        taskId: { type: "string" },
        orgId: { type: "string" },
        type: { type: "string" },
        id: { type: "string" },
        name: { type: "string" },
        data: { type: "object" },
        createdBy: {
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

const CreateTimelineEventSchemaData = z.object({
    id: z.string(),
});

Route.post(
    "/timeline_event",
    describeOkNotFound({
        summary: "Create Timeline Event",
        description: "Create a new timeline event for a task.",
        dataSchema: CreateTimelineEventSchemaData,
        bodySchema: CreateTimelineEventSchema,
        bodyExample: {
            taskId: "abc123",
            orgId: "abc123",
            type: "sidebar",
            id: "integrationId",
            name: "Integration Name",
            data: {}
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
            "public.me.auth.apikey.verify",
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
        const { taskId, orgId, type, id, name, data, createdBy } = body;
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

        const task = await traceAsync(
            "public.me.task.activity.task_lookup",
            () =>
                db.query.task.findFirst({
                    where: (t) =>
                        and(eq(t.id, taskId), eq(t.organizationId, orgId)),
                }),
            {
                description: "Finding task for activity",
                data: { orgId, taskId },
            }
        );

        if (!task) {
            return c.json(errorResponse("Task not found", "No task found with the provided ID in the organization"), 404);
        }
        // --------------------
        // Insert timeline event (✅ canonical path)
        // --------------------
        const value = {
            id: id,
            name: name,
            data: data
        };
        const activity = await traceAsync(
            "public.me.task.activity.insert",
            () =>
                addLogEventTask(
                    taskId,
                    orgId,
                    "integration",
                    type,
                    value ?? null, // ✅ commit metadata lives here
                    userId || undefined
                ),
            {
                description: "Creating task timeline activity",
                data: { orgId, taskId, type: "integration", value },
            }
        );

        // --------------------
        // Broadcast updates
        // --------------------
        await traceAsync(
            "public.me.task.activity.broadcast",
            async () => {
                const taskWithData = await getTaskById(orgId, taskId);

                const message = {
                    type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
                    data: taskWithData,
                };

                sseBroadcastToRoom(
                    orgId,
                    `tasks;task:${taskId}`,
                    message,
                    undefined,
                    true
                );

                if (taskWithData?.visible === "public") {
                    sseBroadcastPublic(orgId, { ...message });
                }

                const members = await getOrganizationMembers(orgId);
                members.forEach((member) => {
                    const clients = findSSEClientsByUserId(member.userId);
                    clients.forEach(
                        (client) =>
                            !(
                                client.channel === `task:${taskId}` ||
                                client.channel === "tasks"
                            ) &&
                            sseBroadcastIndividual(
                                client,
                                message,
                                orgId
                            )
                    );
                });
            },
            { description: "Broadcasting task activity to clients" }
        );
        return c.json(
            successResponse({
                id: activity?.id,
            })
        );
    });

const CreateTaskCommentchemaData = z.object({
    id: z.string(),
});

const CreateTaskCommentData = {
    type: "object",
    required: ["taskId", "orgId", "content"],
    properties: {
        taskId: { type: "string" },
        orgId: { type: "string" },
        content: { type: "string" },
        visibility: {
            type: "string",
            enum: ["public", "internal"],
            default: "public"
        },
        createdBy: {
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
                        name: { type: "string" },
                        profileUrl: { type: "string" },
                    }
                },
                { type: "null" }
            ]
        }
    }
};

Route.post("/create_comment",
    describeOkNotFound({
        summary: "Create Task Comment",
        description: "Create a new comment on a task.",
        dataSchema: CreateTaskCommentchemaData,
        bodySchema: CreateTaskCommentData,
        bodyExample: {
            taskId: "abc123",
            orgId: "abc123",
            content: "## Comment Title",
            visibility: "public",
        },
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
    }), async (c) => {
        const traceAsync = createTraceAsync();

        const authHeader = c.req.header("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

        if (!token) {
            return c.json(errorResponse("Unauthorized", "No authorization header provided"), 401);
        }

        const apiKeyResult = await traceAsync(
            "public.me.auth.apikey.verify",
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
        const { taskId, orgId, content, visibility, createdBy } = body;
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

        const task = await traceAsync(
            "public.me.task.activity.task_lookup",
            () =>
                db.query.task.findFirst({
                    where: (t) =>
                        and(eq(t.id, taskId), eq(t.organizationId, orgId)),
                }),
            {
                description: "Finding task for activity",
                data: { orgId, taskId },
            }
        );

        if (!task) {
            return c.json(errorResponse("Task not found", "No task found with the provided ID in the organization"), 404);
        }

        const descriptionProsekit: any = content ? markdownToProsekitJSON(content) : undefined;

        const comment = await traceAsync(
            "public.me.task.comment.insert",
            () => {
                return createComment(orgId, taskId, descriptionProsekit, visibility, userId, "sayr", createdBy?.name ?? null, createdBy?.profileUrl ?? null, undefined, undefined, undefined, null);

            }
        );

        if (!comment) {
            return c.json({ success: false, error: "Failed to create comment", message: "An error occurred while creating the comment" }, 500);
        }

        await traceAsync(
            "task.comment.create.broadcast",
            async () => {
                const data = {
                    type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
                    data: { id: taskId },
                };
                sseBroadcastToRoom(orgId, `task:${taskId}`, data)
                if (visibility === "public") {
                    sseBroadcastPublic(orgId, { ...data });
                }

                const members = await getOrganizationMembers(orgId);
                members.forEach((member) => {
                    const clients = findSSEClientsByUserId(member.userId);
                    clients.forEach(
                        (client) =>
                            client.orgId !== orgId &&
                            !(client.channel === `task:${taskId}` || client.channel === "tasks") &&
                            sseBroadcastIndividual(client, data, orgId)
                    );
                });
            },
            { description: "Broadcasting new comment to clients" }
        );
        return c.json({ success: true, data: { id: taskId } });
    });