import { type ServerEventMessage, type ServerEventMessageType } from "./types";

type Handlers = Partial<
    Record<ServerEventMessageType, (data: any, msg: ServerEventMessage) => void>
>;

export function sse(url: string, handlers: Handlers = {}) {
    if (!url) {
        throw new Error(
            "[Sayr.sse] SSE URL is required. Did you forget to pass org.eventsUrl?"
        );
    }

    let source: EventSource | null = null;
    let closed = false;

    function connect() {
        if (closed) return;

        source = new EventSource(url);

        source.onmessage = (e) => {
            const msg = JSON.parse(e.data) as ServerEventMessage;
            handlers[msg.type]?.(msg.data, msg);
        };

        source.onerror = () => {
            if (closed) return;
            source?.close();
            setTimeout(connect, 2000); // simple retry
        };
    }

    connect();

    return {
        close() {
            closed = true;
            source?.close();
        }
    };
}