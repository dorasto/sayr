import { auth as authSchema, db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import z from "zod";

/**
 * Public user inside organization member
 */
export const OrganizationMemberUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	image: z.string().nullable(),
	createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
});

/**
 * Organization member
 */
export const OrganizationMemberSchema = z.object({
	id: z.string(),
	userId: z.string(),
	organizationId: z.string(),
	createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
	user: OrganizationMemberUserSchema,
});

//@ts-expect-error
export const OrganizationSchema = createSelectSchema(schema.organization)
	.omit({
		privateId: true,
		isSystemOrg: true,
		createdBy: true,
		polarCustomerId: true,
		polarSubscriptionId: true,
		seatCount: true,
		currentPeriodEnd: true,
	})
	.extend({
		createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
		updatedAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
		eventsUrl: z.string(),
		members: z.array(OrganizationMemberSchema),
	});

//@ts-expect-error
export const PublicUserSchema = createSelectSchema(authSchema.user)
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

/**
 * Full task-with-relations shape (labels, assignees, comments, github links,
 * subtasks, etc.) — matches `getTaskById`'s return, which is assembled from
 * several joined relations rather than a plain table row, so this is a
 * deliberately loose `.passthrough()` rather than an exhaustive field-by-field
 * schema. Precision here is a documentation nicety; the endpoints' actual auth
 * and side-effect correctness is where the real risk is.
 */
export const TaskSchema = z.looseObject({
	id: z.string(),
	shortId: z.number().nullable(),
	title: z.string().nullable(),
	status: z.string(),
	priority: z.string(),
});

export const CommentSchema = z.looseObject({
	id: z.string(),
	taskId: z.string().nullable(),
	organizationId: z.string(),
	content: z.unknown(),
	visibility: z.string(),
});

const ALLOWED_CREATED_BY_PROVIDERS = ["github", "doras", "discord", "slack"] as const;

export const CreatedBySchema = {
	oneOf: [
		{
			type: "object",
			required: ["type", "userId"],
			properties: {
				type: { type: "string", enum: [...ALLOWED_CREATED_BY_PROVIDERS] },
				userId: { type: "string" },
				name: { type: "string" },
				profileUrl: { type: "string" },
			},
		},
		{ type: "null" },
	],
} as const;

/**
 * Resolves a `createdBy` integration-actor payload (`{ type, userId }`) to a
 * real Sayr user id via their linked account, so a webhook-style caller can
 * attribute an action to "the GitHub user who did this" rather than the key
 * owner. Replaces four verbatim copies of the same block that previously
 * lived inline in each handler (`me.ts`'s own `resolveCreatedBy` was defined
 * but never actually called — this is that logic, finally wired up once).
 *
 * Returns `fallbackUserId` (normally the key owner) unchanged when `createdBy`
 * is absent, its provider isn't recognised, or no linked account is found.
 */
export async function resolveActorId(
	createdBy: { type: string; userId: string; name?: string; profileUrl?: string } | null | undefined,
	fallbackUserId: string
): Promise<{ userId: string; invalidProvider: boolean }> {
	if (!createdBy) return { userId: fallbackUserId, invalidProvider: false };

	const provider = createdBy.type;
	const providerId = createdBy.userId;

	if (!(ALLOWED_CREATED_BY_PROVIDERS as readonly string[]).includes(provider)) {
		return { userId: fallbackUserId, invalidProvider: true };
	}

	if (!providerId) return { userId: fallbackUserId, invalidProvider: false };

	const account = await db.query.account.findFirst({
		where: and(eq(authSchema.account.accountId, providerId), eq(authSchema.account.providerId, provider)),
	});

	return { userId: account?.userId ?? fallbackUserId, invalidProvider: false };
}
