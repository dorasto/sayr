import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useEffect, useRef } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { isSseReconnectedMessage } from "@/lib/board/apply-lander-event";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { useServerEventsSubscription } from "./useServerEventsSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "./useWSMessageHandler";

/**
 * The server events a board applies to its data — every type `applyLanderEvent`
 * (lib/board/apply-lander-event.ts) handles. Anything else on the connection is left
 * to whoever else listens.
 */
export const BOARD_SERVER_EVENT_TYPES = [
	"CREATE_TASK",
	"UPDATE_TASK",
	"UPDATE_TASK_VOTE",
	"UPDATE_LABELS",
	"UPDATE_CATEGORIES",
	"UPDATE_RELEASES",
	"DELETE_RELEASE",
] as const satisfies readonly ServerEventMessage["type"][];

export interface BoardServerEventsOptions {
	/**
	 * The orgs to join, over one `orgIds`-mode connection (a single-org board passes one id). Keep the
	 * array's identity stable (memoise it): the subscription reconnects when it changes. Empty = no
	 * subscription at all.
	 */
	orgIds: string[];
	/**
	 * Channels joined in every org — primary first (list `tasks` first when you want task events; the
	 * backend's per-connection task fallback keys off the primary channel). Keep it stable (module-level).
	 */
	channels: readonly string[];
	/**
	 * Applies one board event (one of BOARD_SERVER_EVENT_TYPES) to the host's data, typically as a
	 * functional store update through `applyLanderEvent`. Always the latest callback is called.
	 */
	apply: (message: ServerEventMessage) => void;
	/**
	 * Applies a same-origin window message (the create-task dialog's "task-created" record, see
	 * lib/task-created-message.ts), typically through `applyLanderWindowMessage`. Absent = ignored.
	 */
	applyWindowMessage?: (message: unknown) => void;
	/** Called on `SSE_RECONNECTED`: events sent while the stream was down are lost, so the host should refetch. */
	onResyncNeeded?: () => void;
}

/**
 * Live updates for a board on any page: joins `channels` in each of `orgIds` over the shared SSE
 * connection and hands every board event to `apply`. Deliberately data-agnostic — what an event does
 * to the data is the host's `apply` (for the board's `LanderData` shape that is the pure, tested
 * `applyLanderEvent`); /home's wrapper is hooks/useLanderServerEventsSubscription.ts.
 */
export function useBoardServerEvents({
	orgIds,
	channels,
	apply,
	applyWindowMessage,
	onResyncNeeded,
}: BoardServerEventsOptions) {
	const { serverEvents } = useLayoutData();

	// undefined (not []) when there's nothing to subscribe to, so
	// useServerEventsSubscription's own "nothing changed" check treats a
	// zero-org account the same as never having called connect() at all,
	// rather than issuing a channel-without-any-org request.
	const activeOrgIds = orgIds.length > 0 ? orgIds : undefined;

	useServerEventsSubscription({
		serverEvents,
		channel: activeOrgIds ? channels : undefined,
		orgIds: activeOrgIds,
	});

	const handlers: WSMessageHandler<ServerEventMessage> = Object.fromEntries(
		BOARD_SERVER_EVENT_TYPES.map((type) => [type, apply])
	);

	// useWSMessageHandler keeps `handleMessage` referentially stable and reads the latest
	// `handlers` through a ref, so the listener below is attached once per EventSource.
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);

	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	// Latest callbacks, so the window listeners below attach once instead of on every caller render.
	const applyWindowMessageRef = useRef(applyWindowMessage);
	applyWindowMessageRef.current = applyWindowMessage;
	const onResyncNeededRef = useRef(onResyncNeeded);
	onResyncNeededRef.current = onResyncNeeded;

	// A signal, no data — accepted from any origin, like every other SSE_RECONNECTED listener.
	useEffect(
		() =>
			onWindowMessage<unknown>("*", (message) => {
				if (isSseReconnectedMessage(message)) onResyncNeededRef.current?.();
			}),
		[]
	);

	// This one carries task data, so it is same-origin only: unlike SSE (server-authenticated, room-scoped), a
	// window message can be posted by any page that holds a reference to this window.
	useEffect(
		() =>
			onWindowMessage<unknown>(window.location.origin, (message) => {
				applyWindowMessageRef.current?.(message);
			}),
		[]
	);
}
