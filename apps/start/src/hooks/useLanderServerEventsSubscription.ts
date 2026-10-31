import type { schema } from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { useMemo } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { useLanderData } from "@/contexts/ContextLander";
import {
	applyLanderEvent,
	applyLanderWindowMessage,
	type LanderTaskOrganization,
} from "@/lib/board/apply-lander-event";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { useBoardServerEvents } from "./useBoardServerEvents";

/**
 * The channels the board joins in every org over its one connection: `tasks` (task events) and
 * `releases` (release catalog events). `tasks` stays FIRST — the backend treats the first channel as
 * the connection's own, and its "also send this task update to non-tasks connections individually"
 * fallback keys off `client.channel === "tasks"`; listing `releases` first would double every task event.
 * A module constant so the array's identity never changes between renders.
 */
const LANDER_CHANNELS = ["tasks", "releases"];

/** The same `task.organization` badge shape getLanderData attaches to every task at load time. */
export function toTaskOrganization(org: schema.OrganizationWithMembers): LanderTaskOrganization {
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
 * Deliberately thin: the subscription/listener plumbing is the generic
 * useBoardServerEvents (hooks/useBoardServerEvents.ts, which any other board page can
 * use with its own orgs/channels/apply), and which events matter and what they do to
 * the data is all in lib/board/apply-lander-event.ts (pure, unit-tested). Each event is applied as a
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
	const { organizations } = useLayoutData();
	const { updateLanderData } = useLanderData();

	const orgIds = useMemo(() => organizations.map((org) => org.id), [organizations]);
	const organizationSnapshots = useMemo(
		() => new Map(organizations.map((org) => [org.id, toTaskOrganization(org)])),
		[organizations]
	);

	useBoardServerEvents({
		orgIds,
		channels: LANDER_CHANNELS,
		apply: (msg: ServerEventMessage) =>
			updateLanderData((prev) => applyLanderEvent(prev, msg, { organizations: organizationSnapshots })),
		applyWindowMessage: (message) =>
			updateLanderData((prev) => applyLanderWindowMessage(prev, message, { organizations: organizationSnapshots })),
		onResyncNeeded,
	});
}
