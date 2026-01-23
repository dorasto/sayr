import { useEffect, useRef } from "react";
import { WSMessageType } from "../ws/types";
import { ws } from "../ws";
import type { WSMessage } from "../ws/types";

type Handler = (data: any, msg: WSMessage<unknown>) => void;

type Handlers = Partial<Record<WSMessageType, Handler>>;

export function useSayrWS(
    wsUrl?: string,
    handlers?: Handlers,
) {
    const connRef = useRef<ReturnType<typeof ws> | null>(null);
    const handlersRef = useRef<Handlers | undefined>(handlers);

    // ✅ Keep latest handlers without reconnecting
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!wsUrl) return;

        // ✅ Adapter object: keys stay stable, functions dispatch dynamically
        const proxyHandlers: Handlers = new Proxy(
            {},
            {
                get: (_, type: string) => {
                    return (data: any, msg: WSMessage<unknown>) => {
                        const handler =
                            handlersRef.current?.[type as WSMessageType];
                        if (handler) {
                            handler(data, msg);
                        }
                    };
                },
            },
        );

        connRef.current = ws(wsUrl, proxyHandlers);

        return () => {
            connRef.current?.close();
            connRef.current = null;
        };
    }, [wsUrl]);

    return connRef;
}