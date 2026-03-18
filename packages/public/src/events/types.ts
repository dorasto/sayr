export type ServerEventMessageType =
    | "CONNECTION_STATUS"
    | "ERROR"
    | "UPDATE_ORG"
    | "CREATE_TASK"
    | "UPDATE_TASK"
    | "UPDATE_TASK_COMMENTS"
    | "UPDATE_TASK_VOTE"
    | "UPDATE_LABELS"
    | "UPDATE_VIEWS"
    | "UPDATE_CATEGORIES"
    | "UPDATE_ISSUE_TEMPLATES";

/**
 * String enum replacement for WS event names.
 * Use this instead of raw strings.
 */
export const ServerEvent_EVENTS: Record<ServerEventMessageType, ServerEventMessageType> = {
    CONNECTION_STATUS: "CONNECTION_STATUS",
    ERROR: "ERROR",
    UPDATE_ORG: "UPDATE_ORG",
    CREATE_TASK: "CREATE_TASK",
    UPDATE_TASK: "UPDATE_TASK",
    UPDATE_TASK_COMMENTS: "UPDATE_TASK_COMMENTS",
    UPDATE_TASK_VOTE: "UPDATE_TASK_VOTE",
    UPDATE_LABELS: "UPDATE_LABELS",
    UPDATE_VIEWS: "UPDATE_VIEWS",
    UPDATE_CATEGORIES: "UPDATE_CATEGORIES",
    UPDATE_ISSUE_TEMPLATES: "UPDATE_ISSUE_TEMPLATES",
};

export interface ServerEventMessage<T = unknown> {
    type: ServerEventMessageType;
    scope: "PUBLIC";
    data: T;
    meta?: { ts: number };
}