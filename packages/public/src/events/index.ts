import { type ServerEventMessage, type ServerEventMessageType } from "./types";
interface SSEOptions {
    eventSource?: typeof EventSource;
    eventSourceOptions?: Record<string, any>;
}
type Handlers = Partial<
    Record<
        ServerEventMessageType,
        (data: any, msg: ServerEventMessage) => void
    >
>;

export function sse(
    url: string,
    handlers: Handlers = {},
    opts: SSEOptions = {}
) {
    if (!url) {
        throw new Error(
            "[Sayr.sse] SSE URL is required. Did you forget to pass org.eventsUrl?"
        );
    }
    const ES = opts.eventSource ?? EventSource;
    let source: EventSource | null = null;
    let closed = false;

    function connect() {
        if (closed) return;
        const options = opts.eventSourceOptions ?? {};
        source = new ES(url, options);
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