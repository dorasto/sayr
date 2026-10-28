import type { CreateNotificationHandler, CreateNotificationOptions, NotificationJob, NotificationJobUnion, NotificationMap } from "./types";

export function createNotificationClient<
    T extends NotificationMap,
>(
    handle: CreateNotificationHandler<T>,
) {
    function createNotification<K extends keyof T>(
        options: CreateNotificationOptions<T, K>,
    ) {
        const {
            recipientId,
            actorId,
            data,
            scopeType,
            scopeId,
            resourceType,
            resourceId,
            traceContext,
            type,
            executeAt,
        } = options;

        const job: NotificationJob<T, K> = {
            traceContext,
            executeAt: executeAt ?? new Date().toISOString(),
            payload: {
                recipientId,
                actorId,
                type,
                data,
                scopeType,
                scopeId,
                resourceType,
                resourceId,
            } as NotificationJob<T, K>["payload"],
        };

        return handle(job as NotificationJobUnion<T>);
    }

    return {
        createNotification,
    };
}