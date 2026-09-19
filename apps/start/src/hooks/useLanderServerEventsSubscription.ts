import type { schema } from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { useEffect, useMemo, useRef } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { useLanderData } from "@/contexts/ContextLander";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { useServerEventsSubscription } from "./useServerEventsSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "./useWSMessageHandler";

/**
 * Cross-org counterpart to what apps/start/src/components/pages/admin/orgid/tasks/index.tsx
 * does for a single org — the board (/home) needs live task updates from
 * EVERY org the user belongs to, not just one, so it subscribes the shared
 * SSE connection to all of them at once via useServerEventsSubscription's
 * `orgIds` mode (see apps/backend/routes/events/index.ts) instead of the
 * single-orgId mode every other page uses.
 *
 * Deliberately scoped to task events only (CREATE_TASK/UPDATE_TASK/
 * UPDATE_TASK_VOTE) — matching the actual ask ("changes to tasks like
 * updating status should update in real time"), not label/category/release
 * live sync, which the org-scoped page also has but /home doesn't need yet.
 */
export function useLanderServerEventsSubscription() {
	const { serverEvents, organizations } = useLayoutData();
	const { tasks, setTasks } = useLanderData();

	const orgIds = useMemo(() => organizations.map((org) => org.id), [organizations]);
	const orgById = useMemo(() => new Map(organizations.map((org) => [org.id, org])), [organizations]);
	// undefined (not []) when there's nothing to subscribe to, so
	// useServerEventsSubscription's own "nothing changed" check treats a
	// zero-org account the same as never having called connect() at all,
	// rather than issuing a channel-without-any-org request.
	const activeOrgIds = orgIds.length > 0 ? orgIds : undefined;

	useServerEventsSubscription({
		serverEvents,
		channel: activeOrgIds ? "tasks" : undefined,
		orgIds: activeOrgIds,
	});

	const tasksRef = useRef(tasks);
	tasksRef.current = tasks;

	// A broadcast task record comes straight from the DB row (like
	// getTasksByOrganizationId), with no `.organization` attached — the
	// initial loader (getLanderData) attaches it manually per task, so a
	// live-pushed task needs the same treatment to keep the board's org
	// badge/avatar rendering correctly instead of falling back to the
	// bare-shortId path in board-row.tsx/board-card.tsx.
	const attachOrg = (task: schema.TaskWithLabels): schema.TaskWithLabels => {
		if (task.organization) return task;
		const org = orgById.get(task.organizationId);
		if (!org) return task;
		return {
			...task,
			organization: {
				id: org.id,
				name: org.name,
				slug: org.slug,
				shortId: org.shortId,
				logo: org.logo ? ensureCdnUrl(org.logo) : null,
			},
		};
	};

	const handlers: WSMessageHandler<ServerEventMessage> = {
		CREATE_TASK: (msg) => {
			setTasks([...tasksRef.current, attachOrg(msg.data)]);
		},
		UPDATE_TASK: (msg) => {
			const updated = attachOrg(msg.data);
			setTasks(tasksRef.current.map((task) => (task.id === updated.id ? updated : task)));
		},
		UPDATE_TASK_VOTE: (msg) => {
			const { id, voteCount } = msg.data;
			setTasks(tasksRef.current.map((task) => (task.id === id ? { ...task, voteCount } : task)));
		},
	};

	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);

	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);
}
