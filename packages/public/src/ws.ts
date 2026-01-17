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

export const wsTypes: Record<WSMessageType, WSMessageType> = {
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

type Handlers = Partial<
    Record<WSMessageType, (data: any, msg: WSMessage) => void>
>;

export function ws(url: string, handlers: Handlers = {}) {
    let socket: WebSocket;
    let retry = 0;
    let closed = false;

    function connect() {
        if (closed) return;

        socket = new WebSocket(url);

        socket.onmessage = (e) => {
            const msg = JSON.parse(e.data) as WSMessage;

            if (msg.type === wsTypes.PING) {
                socket.send(JSON.stringify({ type: wsTypes.PONG }));
                return;
            }

            handlers[msg.type]?.(msg.data, msg);
        };

        socket.onclose = () => {
            if (closed) return;
            setTimeout(connect, Math.min(1000 * 2 ** retry++, 30000));
        };

        socket.onerror = () => socket.close();
    }

    connect();

    return {
        close() {
            closed = true;
            socket?.close();
        }
    };
}