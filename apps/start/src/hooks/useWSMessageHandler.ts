import { useCallback, useRef } from "react";

export type WSMessageHandler<T extends { type: string }> = {
	[K in T["type"]]?: (msg: Extract<T, { type: K }>) => void;
};

/**
 * Stable SSE message handler hook.
 * - Keeps `handleMessage` reference stable
 * - Internally updates refs for `handlers`, `onEach`, `onUnhandled`
 */
export function useWSMessageHandler<T extends { type: string }>(
	handlers: WSMessageHandler<T>,
	{
		onEach,
		onUnhandled,
	}: {
		onEach?: (msg: T) => void;
		onUnhandled?: (msg: T) => void;
	} = {}
) {
	const handlersRef = useRef<WSMessageHandler<T>>({});
	const onEachRef = useRef<typeof onEach | null>(null);
	const onUnhandledRef = useRef<typeof onUnhandled | null>(null);

	// Always update refs with latest values
	handlersRef.current = handlers;
	onEachRef.current = onEach;
	onUnhandledRef.current = onUnhandled;

	// stable message handler – never changes
	const handleMessage = useCallback((event: MessageEvent) => {
		const data = JSON.parse(event.data) as T;

		// optional "tap-in"
		onEachRef.current?.(data);

		const handler = handlersRef.current[data.type as keyof WSMessageHandler<T>] as ((msg: T) => void) | undefined;

		if (handler) {
			handler(data);
		} else {
			onUnhandledRef.current?.(data);
		}
	}, []);

	return handleMessage;
}
