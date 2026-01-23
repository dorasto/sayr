import { WS_EVENTS, type WSMessage, type WSMessageType } from "./types";

type Handlers = Partial<
    Record<WSMessageType, (data: any, msg: WSMessage) => void>
>;

export function ws(url: string, handlers: Handlers = {}) {
    if (!url) {
        throw new Error(
            "[Sayr.ws] WebSocket URL is required. " +
            "Did you forget to pass org.wsUrl?"
        );
    }
    let socket: WebSocket;
    let retry = 0;
    let closed = false;

    function connect() {
        if (closed) return;

        socket = new WebSocket(url);

        socket.onmessage = (e) => {
            const msg = JSON.parse(e.data) as WSMessage;

            if (msg.type === WS_EVENTS.PING) {
                socket.send(JSON.stringify({ type: WS_EVENTS.PONG }));
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