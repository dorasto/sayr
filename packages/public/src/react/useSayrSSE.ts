import { useEffect, useRef } from "react";
import { ServerEventMessageType } from "../events/types";
import { sse } from "../events";
import type { ServerEventMessage } from "../events/types";

type Handler = (data: any, msg: ServerEventMessage) => void;

type Handlers = Partial<Record<ServerEventMessageType, Handler>>;

export function useSayrSSE(eventsUrl?: string, handlers?: Handlers) {
    const connRef = useRef<ReturnType<typeof sse> | null>(null);
    const handlersRef = useRef<Handlers | undefined>(handlers);

    // keep latest handlers
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!eventsUrl) return;

        // proxy: stable keys, dynamic handler resolution
        const proxyHandlers: Handlers = new Proxy(
            {},
            {
                get: (_, type: string) => {
                    return (data: any, msg: ServerEventMessage) => {
                        const handler =
                            handlersRef.current?.[type as ServerEventMessageType];
                        if (handler) {
                            handler(data, msg);
                        }
                    };
                }
            }
        );

        connRef.current = sse(eventsUrl, proxyHandlers);

        return () => {
            connRef.current?.close();
            connRef.current = null;
        };
    }, [eventsUrl]);

    return connRef;
}