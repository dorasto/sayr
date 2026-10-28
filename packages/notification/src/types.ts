import { SQL } from "drizzle-orm/sql";

export type NotificationData = Record<string, unknown>;

export type NotificationMap = Record<string, NotificationData>;

export type NotificationType = string;

export type TraceContext = {
    traceId?: string;
    spanId?: string;
    traceFlags?: number;
};

export type NotificationContext = {
    recipientId: string;
    actorId?: string | null;
    scopeType?: string | null;
    scopeId?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
};

export type NotificationPayload<
    T extends NotificationMap,
    K extends keyof T = keyof T,
> = K extends keyof T
    ? NotificationContext & {
        type: K;
        data: T[K];
    }
    : never;

export type CreateNotificationInput<
    T extends NotificationMap,
    K extends keyof T = keyof T,
> = NotificationPayload<T, K> & {
    delivered?: boolean;
};

export type NotificationColumn =
    | "id"
    | "recipientId"
    | "actorId"
    | "resourceId"
    | "scopeType"
    | "scopeId"
    | "type"
    | "resourceType"
    | "data"
    | "delivered"
    | "readAt"
    | "createdAt"
    | "updatedAt";

export type NotificationColumns = Partial<
    Record<NotificationColumn, boolean>
>;

export type NotificationRelations = Record<
    string,
    boolean | object
>;

export type ListNotificationsOptions = {
    conditions?: SQL<unknown>[];
    columns?: NotificationColumns;
    with?: NotificationRelations;
    limit?: number;
    page?: number;
};
export type MarkNotificationOptions =
    | {
        id: string;
        recipientId: string;
        resourceId?: string;
    }
    | {
        id: string;
        recipientId?: string;
        resourceId: string;
    };
export type MarkByDataNotificationOptions =
    | {
        conditions?: SQL<unknown>[];
        recipientId: string;
        resourceId?: string;
    }
    | {
        conditions?: SQL<unknown>[];
        recipientId?: string;
        resourceId: string;
    };
export type MarkAllNotificationOptions =
    | {
        recipientId: string;
        resourceId?: string;
    }
    | {
        recipientId?: string;
        resourceId: string;
    };
export type CreateNotificationOptions<
    T extends NotificationMap,
    K extends keyof T = keyof T,
> = NotificationPayload<T, K> & {
    traceContext?: TraceContext;
    executeAt?: string;
};

export type NotificationJob<
    T extends NotificationMap,
    K extends keyof T = keyof T,
> = {
    traceContext?: TraceContext;
    executeAt?: string;
    payload: NotificationPayload<T, K>;
};

export type NotificationJobUnion<
    T extends NotificationMap,
> = {
    [K in keyof T]: NotificationJob<T, K>;
}[keyof T];

export type CreateNotificationHandler<
    T extends NotificationMap,
> = (
    job: NotificationJobUnion<T>,
) => unknown | Promise<unknown>;

export type NotificationRecord<
    T extends NotificationMap = NotificationMap,
> = {
    id: string;
    recipientId: string;
    actorId: string | null;
    scopeType: string | null;
    scopeId: string | null;
    type: keyof T;
    resourceType: string | null;
    resourceId: string | null;
    data: T[keyof T];
    delivered: boolean;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NotificationSettingsRecord = {
    recipientId: string;
    notificationsEnabled: boolean;
    mutedUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type UpdateNotificationSettingsInput = {
    notificationsEnabled?: boolean;
    mutedUntil?: Date | null;
};

export type NotificationRepository<
    T extends NotificationMap,
> = {
    getSettings(
        recipientId: string,
    ): Promise<NotificationSettingsRecord | null>;

    createNotification(
        input: CreateNotificationInput<T>,
    ): Promise<NotificationRecord<T>>;

    listNotifications(
        options?: ListNotificationsOptions,
    ): Promise<{
        notifications: any;
        unreadCount: number;
        paginated: {
            page: number;
            limit: number;
            totalPages: number;
            totalItems: any;
            hasMore: boolean;
        }
    }>;

    markRead(
        options?: MarkNotificationOptions,
    ): Promise<boolean>;
    markReadByData(
        options?: MarkByDataNotificationOptions,
    ): Promise<boolean>;
    markAllRead(
        options?: MarkAllNotificationOptions,
    ): Promise<boolean>;
};
