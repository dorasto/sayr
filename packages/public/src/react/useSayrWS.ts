import { useEffect, useRef } from "react";
import { WSMessageType } from "../ws/types";
import { ws } from "../ws";

type Handlers = Partial<
    Record<WSMessageType, (data: any, msg: any) => void>
>;

export function useSayrWS(
    wsUrl?: string,
    handlers?: Handlers
) {
    const connRef = useRef<ReturnType<typeof ws> | null>(null);

    useEffect(() => {
        if (!wsUrl) return;

        connRef.current = ws(wsUrl, handlers);

        return () => {
            connRef.current?.close();
            connRef.current = null;
        };
    }, [wsUrl]);

    return connRef;
}