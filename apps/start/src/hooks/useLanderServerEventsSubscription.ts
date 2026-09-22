import type { schema } from "@repo/database";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { ensureCdnUrl } from "@repo/util";
import { useEffect, useMemo } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { useLanderData } from "@/contexts/ContextLander";
import {
	applyLanderEvent,
	applyLanderWindowMessage,
	isSseReconnectedMessage,
	type LanderTaskOrganization,
} from "@/lib/board/apply-lander-event";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { useServerEventsSubscription } from "./useServerEventsSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "./useWSMessageHandler";

/**
 * The channels the board joins in every org over its one connection: `tasks` (task events) and
 * `releases` (release catalog events). `tasks` stays FIRST — the backend treats the first channel as
 * the connection's own, and its "also send this task update to non-tasks connections individually"
 * fallback keys off `client.channel === "tasks"`; listing `releases` first would double every task event.
 * A module constant so the array's identity never changes between renders.
 */
const LANDER_CHANNELS = ["tasks", "releases"];

/** The same `task.organization` badge shape getLanderData attaches to every task at load time. */
function toTaskOrganization(org: schema.OrganizationWithMembers): LanderTaskOrganization {
	return {
		id: org.id,
		name: org.name,
		slug: org.slug,
		shortId: org.shortId,
		logo: org.logo ? ensureCdnUrl(org.logo) : null,
	};
}

/**
 * Cross-org counterpart to what apps/start/src/components/pages/admin/orgid/tasks/index.tsx
 * does for a single org — the board (/home) needs live updates from EVERY org
 * the user belongs to, so it subscribes the shared SSE connection to all of them
 * at once via useServerEventsSubscription's `orgIds` mode (see
 * apps/backend/routes/events/index.ts) instead of the single-orgId mode every
 * other page uses. It asks for several channels over that one connection
 * (LANDER_CHANNELS); more entities can join the board by adding a channel here and
 * a case in the reducer.
 *
 * Deliberately thin: which events matter and what they do to the data is all in
 * lib/board/apply-lander-event.ts (pure, unit-tested). Each event is applied as a
 * functional store update, so events arriving before a re-render can't overwrite
 * one another. Covers what the org pages handle on the same subscriptions — tasks
 * (create/update/vote), labels/categories and releases — minus UPDATE_VIEWS
 * (org-level saved views; the board's saved views are personal and live in
 * personal-views-store) and the task-dialog timeline messages (the board opens
 * tasks as pages, not a dialog).
 *
 * Two things arrive by other routes than the SSE stream:
 *  - "task-created" window messages, from the create-task dialog: the server leaves the
 *    creating client out of the CREATE_TASK broadcast, so the dialog announces the record
 *    itself (lib/task-created-message.ts) and the reducer applies it like a CREATE_TASK.
 *  - `SSE_RECONNECTED` (lib/serverEvents.ts posts it ~2s after the stream is back): events
 *    sent while it was down are gone for good, which can't be patched from an event, so the
 *    board re-fetches its loader (`onResyncNeeded`, wired to a router invalidation by the route).
 */
export function useLanderServerEventsSubscription({ onResyncNeeded }: { onResyncNeeded: () => void }) {
	const { serverEvents, organizations } = useLayoutData();
	const { updateLanderData } = useLanderData();

	const orgIds = useMemo(() => organizations.map((org) => org.id), [organizations]);
	const organizationSnapshots = useMemo(
		() => new Map(organizations.map((org) => [org.id, toTaskOrganization(org)])),
		[organizations]
	);
	// undefined (not []) when there's nothing to subscribe to, so
	// useServerEventsSubscription's own "nothing changed" check treats a
	// zero-org account the same as never having called connect() at all,
	// rather than issuing a channel-without-any-org request.
	const activeOrgIds = orgIds.length > 0 ? orgIds : undefined;

	useServerEventsSubscription({
		serverEvents,
		channel: activeOrgIds ? LANDER_CHANNELS : undefined,
		orgIds: activeOrgIds,
	});

	const applyEvent = (msg: ServerEventMessage) => {
		updateLanderData((prev) => applyLanderEvent(prev, msg, { organizations: organizationSnapshots }));
	};

	const handlers: WSMessageHandler<ServerEventMessage> = {
		CREATE_TASK: applyEvent,
		UPDATE_TASK: applyEvent,
		UPDATE_TASK_VOTE: applyEvent,
		UPDATE_LABELS: applyEvent,
		UPDATE_CATEGORIES: applyEvent,
		UPDATE_RELEASES: applyEvent,
		DELETE_RELEASE: applyEvent,
	};

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

	// A signal, no data — accepted from any origin, like every other SSE_RECONNECTED listener.
	useEffect(
		() =>
			onWindowMessage<unknown>("*", (message) => {
				if (isSseReconnectedMessage(message)) onResyncNeeded();
			}),
		[onResyncNeeded]
	);

	// This one carries task data, so it is same-origin only: unlike SSE (server-authenticated, room-scoped), a
	// window message can be posted by any page that holds a reference to this window.
	useEffect(
		() =>
			onWindowMessage<unknown>(window.location.origin, (message) => {
				updateLanderData((prev) =>
					applyLanderWindowMessage(prev, message, { organizations: organizationSnapshots })
				);
			}),
		[updateLanderData, organizationSnapshots]
	);
}
