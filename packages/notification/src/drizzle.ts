import {
    and,
    desc,
    eq,
    isNull,
    relations,
    type SQL,
} from "drizzle-orm";
import {
    type InferInsertModel,
    type InferSelectModel,
} from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";

import type {
    CreateNotificationInput,
    ListNotificationsOptions,
    MarkAllNotificationOptions,
    MarkByDataNotificationOptions,
    MarkNotificationOptions,
    NotificationMap,
    NotificationRecord,
    NotificationRepository,
    NotificationSettingsRecord,
} from "./types";

export type NotificationReferences = {
    recipientId: () => v.AnyPgColumn;
    actorId?: () => v.AnyPgColumn;
    resourceId?: () => v.AnyPgColumn;
};

export type NotificationRelationTables = {
    recipient: v.AnyPgTable;
    actor?: v.AnyPgTable;
    resourceId?: v.AnyPgTable;
};

export function createNotificationSchema(
    references: NotificationReferences,
) {
    const recipientId = v
        .text("recipient_id")
        .notNull()
        .references(references.recipientId, {
            onDelete: "cascade",
        });

    const actorId = references.actorId
        ? v.text("actor_id").references(references.actorId, {
            onDelete: "set null",
        })
        : v.text("actor_id");

    const resourceId = references.resourceId
        ? v.text("resource_id").references(references.resourceId, {
            onDelete: "set null",
        })
        : v.text("resource_id");

    const notifications = table(
        "notifications",
        {
            id: v.uuid("id").primaryKey().defaultRandom(),

            recipientId,
            actorId,
            resourceId,

            scopeType: v.text("scope_type"),
            scopeId: v.text("scope_id"),

            type: v.text("type").notNull(),
            resourceType: v.text("resource_type"),

            data: v
                .jsonb("data")
                .$type<Record<string, unknown>>()
                .notNull(),

            delivered: v
                .boolean("delivered")
                .default(false)
                .notNull(),

            readAt: v.timestamp("read_at", {
                withTimezone: true,
            }),

            createdAt: v
                .timestamp("created_at", {
                    withTimezone: true,
                })
                .defaultNow()
                .notNull(),

            updatedAt: v
                .timestamp("updated_at", {
                    withTimezone: true,
                })
                .defaultNow()
                .notNull(),
        },
        (t) => [
            v
                .index("notification_recipient_created_idx")
                .on(t.recipientId, t.createdAt),

            v
                .index("notification_recipient_read_idx")
                .on(t.recipientId, t.readAt),

            v
                .index("notification_scope_idx")
                .on(t.scopeType, t.scopeId),

            v
                .index("notification_resource_idx")
                .on(t.resourceType, t.resourceId),

            v.index("notification_actor_idx").on(t.actorId),

            v.index("notification_type_idx").on(t.type),
        ],
    );

    const notificationSettings = table("notification_settings", {
        recipientId: v
            .text("recipient_id")
            .primaryKey()
            .references(references.recipientId, {
                onDelete: "cascade",
            }),

        notificationsEnabled: v
            .boolean("notifications_enabled")
            .default(true)
            .notNull(),

        mutedUntil: v.timestamp("muted_until", {
            withTimezone: true,
        }),

        createdAt: v
            .timestamp("created_at", {
                withTimezone: true,
            })
            .defaultNow()
            .notNull(),

        updatedAt: v
            .timestamp("updated_at", {
                withTimezone: true,
            })
            .defaultNow()
            .notNull(),
    });

    return {
        notifications,
        notificationSettings,
    };
}

export type NotificationSchema = ReturnType<
    typeof createNotificationSchema
>;

export type NotificationTable =
    NotificationSchema["notifications"];

export type NotificationSettingsTable =
    NotificationSchema["notificationSettings"];

export type Notification =
    InferSelectModel<NotificationTable>;

export type NewNotification =
    InferInsertModel<NotificationTable>;

export type NotificationSettings =
    InferSelectModel<NotificationSettingsTable>;

export type NewNotificationSettings =
    InferInsertModel<NotificationSettingsTable>;

export type DrizzleNotificationOptions = {
    db: any;
    schema: NotificationSchema;
};

export function createNotificationRelations(
    schema: NotificationSchema,
    references: NotificationReferences,
    tables: NotificationRelationTables,
) {
    const notificationRelations = relations(
        schema.notifications,
        ({ one }) => ({
            recipient: one(tables.recipient, {
                fields: [schema.notifications.recipientId],
                references: [references.recipientId()],
                relationName: "notificationRecipient",
            }),

            ...(tables.actor && references.actorId
                ? {
                    actor: one(tables.actor, {
                        fields: [schema.notifications.actorId],
                        references: [references.actorId()],
                        relationName: "notificationActor",
                    }),
                }
                : {}),

            ...(tables.resourceId && references.resourceId
                ? {
                    resourceId: one(tables.resourceId, {
                        fields: [schema.notifications.resourceId],
                        references: [references.resourceId()],
                        relationName: "notificationResource",
                    }),
                }
                : {}),
        }),
    );

    const notificationSettingsRelations = relations(
        schema.notificationSettings,
        ({ one }) => ({
            recipient: one(tables.recipient, {
                fields: [
                    schema.notificationSettings.recipientId,
                ],
                references: [references.recipientId()],
                relationName: "notificationSettingsRecipient",
            }),
        }),
    );

    return {
        notificationRelations,
        notificationSettingsRelations,
    };
}

export function createDrizzleNotificationRepository<
    T extends NotificationMap,
>({
    db,
    schema,
}: DrizzleNotificationOptions): NotificationRepository<T> {
    const {
        notifications,
        notificationSettings,
    } = schema;

    return {
        async getSettings(
            recipientId: string,
        ): Promise<NotificationSettingsRecord | null> {
            const [settings] = await db
                .select()
                .from(notificationSettings)
                .where(
                    eq(
                        notificationSettings.recipientId,
                        recipientId,
                    ),
                )
                .limit(1);

            if (!settings) {
                return null;
            }

            return {
                recipientId: settings.recipientId,
                notificationsEnabled:
                    settings.notificationsEnabled,
                mutedUntil: settings.mutedUntil,
                createdAt: settings.createdAt,
                updatedAt: settings.updatedAt,
            };
        },

        async createNotification(
            input: CreateNotificationInput<T>,
        ): Promise<NotificationRecord<T>> {
            const [notification] = await db
                .insert(notifications)
                .values({
                    recipientId: input.recipientId,
                    actorId: input.actorId ?? null,
                    type: input.type,
                    scopeType: input.scopeType ?? null,
                    scopeId: input.scopeId ?? null,
                    resourceType: input.resourceType ?? null,
                    resourceId: input.resourceId ?? null,
                    data: input.data,
                    delivered: input.delivered ?? false,
                })
                .returning();

            if (!notification) {
                throw new Error(
                    "Failed to create notification",
                );
            }

            return notification as NotificationRecord<T>;
        },

        async listNotifications(
            options: ListNotificationsOptions = {},
        ) {
            const {
                conditions = [],
                columns,
                with: relations,
                limit = 20,
                page = 1,
            } = options;
            if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
                throw Error(`limit must be an integer between 1 and 50`)
            }

            if (!Number.isInteger(page) || page < 1) {
                throw Error("page must be an integer greater than 0")
            }

            const offset = (page - 1) * limit;
            const [notification, totalResult, unreadResult] = await Promise.all([
                db.query.notifications.findMany({
                    where: conditions.length > 0
                        ? and(...conditions)
                        : undefined,
                    columns,
                    with: relations,
                    orderBy: desc(notifications.createdAt),
                    limit,
                    offset,
                }),
                db.$count(schema.notifications,
                    conditions.length > 0
                        ? and(...conditions)
                        : undefined
                ),
                db.$count(
                    schema.notifications,
                    and(
                        eq(schema.notifications.delivered, true),
                        isNull(schema.notifications.readAt),
                        ...conditions,
                    ),
                ),
            ]);
            const total = totalResult ?? 0;
            const totalPages = Math.ceil(total / limit);
            return {
                notifications: notification,
                unreadCount: unreadResult ?? 0,
                paginated: {
                    page,
                    limit,
                    totalPages,
                    totalItems: total,
                    hasMore: page < totalPages,
                }
            }
        },

        async markRead(options: MarkNotificationOptions) {
            const conditions = [
                eq(notifications.id, options.id),
                options.recipientId !== undefined
                    ? eq(notifications.recipientId, options.recipientId)
                    : undefined,
                options.resourceId !== undefined
                    ? eq(notifications.resourceId, options.resourceId)
                    : undefined,
            ];

            const now = new Date();

            await db
                .update(notifications)
                .set({
                    readAt: now,
                    updatedAt: now,
                })
                .where(and(...conditions))

            return true;
        },

        async markReadByData(options: MarkByDataNotificationOptions) {
            const conditions = [
                options.recipientId !== undefined
                    ? eq(notifications.recipientId, options.recipientId)
                    : undefined,
                options.resourceId !== undefined
                    ? eq(notifications.resourceId, options.resourceId)
                    : undefined,
            ];

            const now = new Date();

            const updated = await db
                .update(notifications)
                .set({
                    readAt: now,
                    updatedAt: now,
                })
                .where(and(...conditions,
                    isNull(notifications.readAt),
                    ...(options.conditions ?? [])
                )).returning({ id: notifications.id });
            return updated.length;
        },

        async markAllRead(options: MarkAllNotificationOptions) {
            const conditions = [
                options.recipientId !== undefined
                    ? eq(notifications.recipientId, options.recipientId)
                    : undefined,
                options.resourceId !== undefined
                    ? eq(notifications.resourceId, options.resourceId)
                    : undefined,
                eq(notifications.delivered, true),
                isNull(notifications.readAt),
            ];

            const now = new Date();

            await db
                .update(notifications)
                .set({
                    readAt: now,
                    updatedAt: now,
                })
                .where(and(...conditions))

            return true;
        }
    };
}