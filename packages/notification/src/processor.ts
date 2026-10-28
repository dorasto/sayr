import type {
    NotificationJob,
    NotificationJobUnion,
    NotificationMap,
    NotificationRecord,
    NotificationRepository,
} from "./types";


export type NotificationCreatedHandler<
    T extends NotificationMap,
> = (
    notification: NotificationRecord<T>,
    job: NotificationJobUnion<T>,
) => unknown | Promise<unknown>;

export function createNotificationProcessor<
    T extends NotificationMap,
>(
    repository: NotificationRepository<T>,
    onCreated?: NotificationCreatedHandler<T>,
) {
    return async function processNotificationCreate(
        job: NotificationJobUnion<T>,
    ) {
        const settings = await repository.getSettings(
            job.payload.recipientId,
        );

        const disabled =
            settings?.notificationsEnabled === false;

        const muted =
            settings?.mutedUntil != null &&
            settings.mutedUntil > new Date();

        const notification = await repository.createNotification({
            ...job.payload,
            delivered: !disabled && !muted,
        });

        if (onCreated && notification.delivered) {
            await onCreated(notification, job);
        }

        return notification;
    };
}