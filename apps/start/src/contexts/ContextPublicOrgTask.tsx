"use client";

import type { schema } from "@repo/database";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { publicCommentsKey } from "@/components/public/portal/post/usePostComments";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { publicVotesKey } from "@/hooks/portal/usePublicVotes";
import { useVote } from "@/hooks/portal/useVote";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";

interface ContextType {
	task: schema.TaskWithLabels;
	setTask: (task: schema.TaskWithLabels) => void;
	release?: schema.releaseType | null;
	/** Org slug segment of the current URL, e.g. "acme" from /orgs/acme/123. */
	orgSlug: string;
	isMember: boolean;
	isVoted: boolean;
	voteCount: number;
	/** Voting is closed (canceled posts). Never because of login: anonymous voting stays on. */
	voteDisabled: boolean;
	handleVote: () => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

/**
 * Owns live task state (SSE-synced), vote state, and membership for the
 * public task detail page. Both the main content and the "Details" side
 * panel (apps/start/src/components/public/panels/task.tsx) read from this
 * context instead of props, so the panel only needs `setPanelContent` once
 * — see the page-component skill.
 */
export function PublicTaskProvider({
	children,
	task: initialTask,
	release,
}: {
	children: ReactNode;
	task: schema.TaskWithLabels;
	release?: schema.releaseType | null;
}) {
	const { organization, serverEvents } = usePublicOrganizationLayout();
	const queryClient = useQueryClient();
	const isMember = useIsOrgMember(organization);

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const orgSlugMatch = rawPathname.match(/^\/orgs\/([^/]+)/);
	const orgSlug = orgSlugMatch?.[1] ?? "";

	// Local task state so WS/SSE updates can mutate it in real-time.
	const [task, setTask] = useState(initialTask);

	// Sync if the server prop changes (e.g. navigation to a different task).
	useEffect(() => {
		setTask(initialTask);
	}, [initialTask]);

	// The shared optimistic vote toggle (also used by the board). Voting is never login-gated.
	const {
		voted: isVoted,
		voteCount,
		disabled: voteDisabled,
		toggle,
	} = useVote({
		organizationId: organization.id,
		task: { id: task.id, voteCount: task.voteCount, status: task.status },
	});

	// SSE handlers for real-time updates on this task.
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_TASK: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id && msg.data.id === task.id) {
				// Merge so fields the event payload omits (parent, GitHub issue, creator) are not lost.
				setTask((previous) => ({ ...previous, ...msg.data }));
			}
		},
		UPDATE_TASK_VOTE: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id && msg.data.id === task.id) {
				setTask((previous) => ({ ...previous, voteCount: msg.data.voteCount }));
				void queryClient.invalidateQueries({ queryKey: publicVotesKey(organization.id) });
			}
		},
		UPDATE_TASK_COMMENTS: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id && msg.data.id === task.id) {
				queryClient.invalidateQueries({
					queryKey: publicCommentsKey(task.id, task.organizationId),
				});
			}
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

	useEffect(() => {
		const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
			if (msg.type === "SSE_RECONNECTED") {
				queryClient.invalidateQueries({
					queryKey: publicCommentsKey(task.id, task.organizationId),
				});
			}
		});
		return unsubscribe;
	}, [task.id, queryClient, task.organizationId]);

	return (
		<RootContext.Provider
			value={{
				task,
				setTask,
				release,
				orgSlug,
				isMember,
				isVoted,
				voteCount,
				voteDisabled,
				handleVote: () => {
					void toggle();
				},
			}}
		>
			{children}
		</RootContext.Provider>
	);
}

export function usePublicTask() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("usePublicTask must be used within a PublicTaskProvider");
	}
	return context;
}
