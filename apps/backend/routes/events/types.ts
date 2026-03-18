export type ServerEventBaseMessage = {
    type:
    | "CONNECTION_STATUS"
    | "SERVER_MESSAGE"
    | "ERROR"
    | "PING"
    | "PONG"
    | "MESSAGE"
    | "SUBSCRIBED"
    | "SUBSCRIBE"
    | "UNSUBSCRIBE"
    | "USER_UNSUBSCRIBED"
    | "USER_SUBSCRIBED"
    | "UPDATE_ORG"
    | "CREATE_PROJECT"
    | "CREATE_TASK"
    | "UPDATE_TASK"
    | "UPDATE_LABELS"
    | "FIREHOSE"
    | "CONNECTIONS_SNAPSHOT"
    | "WAITING_ROOM"
    | "DISCONNECTED"
    | "UPDATE_VIEWS"
    | "UPDATE_CATEGORIES"
    | "UPDATE_ISSUE_TEMPLATES"
    | "UPDATE_RELEASES"
    | "DELETE_RELEASE"
    | "MEMBER_ACTIONS"
    | "NEW_NOTIFICATION"
    | "NOTIFICATION_READ";
    // biome-ignore lint/suspicious/noExplicitAny: <any>
    data?: any;
    orgId?: string;
    channel?: string;
    scope: "INDIVIDUAL" | "CHANNEL" | "PUBLIC";
    meta?: {
        ts: number;
        channel?: string;
        orgId?: string;
        [key: string]: string | number | undefined | null;
    };
};