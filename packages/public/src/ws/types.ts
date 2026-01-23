export type WSMessageType =
    | "CONNECTION_STATUS"
    | "SUBSCRIBED"
    | "ERROR"
    | "PING"
    | "PONG"
    | "UPDATE_ORG"
    | "CREATE_TASK"
    | "UPDATE_TASK"
    | "UPDATE_TASK_COMMENTS"
    | "UPDATE_TASK_VOTE"
    | "UPDATE_LABELS"
    | "UPDATE_VIEWS"
    | "UPDATE_CATEGORIES"
    | "UPDATE_ISSUE_TEMPLATES"
    | "DISCONNECTED";

/**
 * String enum replacement for WS event names.
 * Use this instead of raw strings.
 */
export const WS_EVENTS: Record<WSMessageType, WSMessageType> = {
    CONNECTION_STATUS: "CONNECTION_STATUS",
    SUBSCRIBED: "SUBSCRIBED",
    ERROR: "ERROR",
    PING: "PING",
    PONG: "PONG",
    UPDATE_ORG: "UPDATE_ORG",
    CREATE_TASK: "CREATE_TASK",
    UPDATE_TASK: "UPDATE_TASK",
    UPDATE_TASK_COMMENTS: "UPDATE_TASK_COMMENTS",
    UPDATE_TASK_VOTE: "UPDATE_TASK_VOTE",
    UPDATE_LABELS: "UPDATE_LABELS",
    UPDATE_VIEWS: "UPDATE_VIEWS",
    UPDATE_CATEGORIES: "UPDATE_CATEGORIES",
    UPDATE_ISSUE_TEMPLATES: "UPDATE_ISSUE_TEMPLATES",
    DISCONNECTED: "DISCONNECTED"
};

export interface WSMessage<T = unknown> {
    type: WSMessageType;
    scope: "PUBLIC";
    data: T;
    meta?: { ts: number };
}