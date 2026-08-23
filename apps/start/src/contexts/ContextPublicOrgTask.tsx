"use client";

import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement, useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { CreateTaskVoteAction } from "@/lib/fetches/task";
import type { ServerEventMessage } from "@/lib/serverEvents";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

interface ContextType {
	task: schema.TaskWithLabels;
	setTask: (task: schema.TaskWithLabels) => void;
	release?: schema.releaseType | null;
	/** Org slug segment of the current URL, e.g. "acme" from /orgs/acme/123. */
	orgSlug: string;
	isMember: boolean;
	isVoted: boolean;
	voteCount: number;
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
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const isMember = useIsOrgMember(organization);

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const orgSlugMatch = rawPathname.match(/^\/orgs\/([^/]+)/);
	const orgSlug = orgSlugMatch?.[1] ?? "";

	// Local task state so WS/SSE updates can mutate it in real-time.
	const [task, setTask] = useState(initialTask);

	// Sync if the server prop changes (e.g. navigation to a different task).
	useEffect(() => {
		setTask(initialTask);
		setLocalVoteCount(initialTask.voteCount);
	}, [initialTask]);

	// Fetch votes for this org (ensures vote state is available even on direct navigation).
	const {
		value: { data: votesData, refetch: refetchVotes },
	} = useStateManagementFetch<
		{
			taskId: string;
			voteCount: number;
			count: number;
		}[],
		Partial<
			{
				taskId: string;
				voteCount: number;
				count: number;
			}[]
		>
	>({
		key: ["votes", organization.id],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/voted?orgId=${organization.id}`,
			custom: async (url) => {
				const res = await fetch(url, { credentials: "include" });
				if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
				const data = await res.json();
				return data.data.tasks;
			},
		},
		staleTime: 1000,
		gcTime: 2000 * 60,
		refetchOnWindowFocus: false,
	});

	const votes = votesData ?? [];
	const isVoted = !!votes.find((v) => v.taskId === task.id);

	// Track vote count locally for optimistic updates.
	const [localVoteCount, setLocalVoteCount] = useState(task.voteCount);

	const handleVote = async () => {
		const votesKey = ["votes", organization.id];
		const previousVotes =
			queryClient.getQueryData<
				{
					taskId: string;
					voteCount: number;
					count: number;
				}[]
			>(votesKey);
		const previousCount = localVoteCount;

		// Optimistic: toggle vote state and count.
		queryClient.setQueryData(votesKey, (old: { taskId: string; voteCount: number; count: number }[] | undefined) => {
			if (!old) return old;
			return isVoted
				? old.filter((v) => v.taskId !== task.id)
				: [...old, { taskId: task.id, voteCount: 0, count: 1 }];
		});
		setLocalVoteCount(isVoted ? localVoteCount - 1 : localVoteCount + 1);

		try {
			await CreateTaskVoteAction(organization.id, task.id, sseClientId);
		} catch (error) {
			console.error(error);
			headlessToast.error({
				title: "Failed to vote",
				description: "Could not update vote.",
			});
			queryClient.setQueryData(votesKey, previousVotes);
			setLocalVoteCount(previousCount);
		}
	};

	// SSE handlers for real-time updates on this task.
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_TASK: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id && msg.data.id === task.id) {
				setTask(msg.data);
			}
		},
		UPDATE_TASK_VOTE: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id && msg.data.id === task.id) {
				setLocalVoteCount(msg.data.voteCount);
				refetchVotes();
			}
		},
		UPDATE_TASK_COMMENTS: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id && msg.data.id === task.id) {
				queryClient.invalidateQueries({
					queryKey: ["public-comments", task.id, task.organizationId],
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
					queryKey: ["public-comments", task.id, task.organizationId],
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
				voteCount: localVoteCount,
				handleVote,
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
