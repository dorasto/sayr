import type { schema } from "@repo/database";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowLeft, IconLayoutSidebarRight, IconLayoutSidebarRightFilled } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { Page } from "@/components/generic/page";
import { usePage, usePanel } from "@/components/generic/use-page";
import { LatestUpdateCard } from "@/components/public/portal/post/LatestUpdateCard";
import { PostBottomBar } from "@/components/public/portal/post/PostBottomBar";
import { PostGithubCard } from "@/components/public/portal/post/PostGithubCard";
import { DESCRIPTION_PROSE } from "@/components/public/portal/post/prose";
import { PostHeader } from "@/components/public/portal/post/PostHeader";
import { PostStatusBanner } from "@/components/public/portal/post/PostStatusBanner";
import { PostStepperCard } from "@/components/public/portal/post/PostStepperCard";
import { PostSubtasks } from "@/components/public/portal/post/PostSubtasks";
import { usePostComments } from "@/components/public/portal/post/usePostComments";
import { PortalButton } from "@/components/public/portal/ui/PortalButton";
import { PublicTaskPanelContent, PublicTaskPanelHeaderActions } from "@/components/public/panels/task";
import { PublicTaskProvider, usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getDisplayName } from "@repo/util";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { getLatestUpdate } from "@/lib/portal/latest-update";
import { isTeamMember } from "@/lib/portal/team";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PublicComments } from "./public-comments";

const Editor = lazy(() => import("@/components/prosekit/editor"));

export const PUBLIC_TASK_PANEL_ID = "public-task-panel";

interface PublicTaskContentProps {
	task: schema.TaskWithLabels;
	release?: schema.releaseType | null;
}

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

// Shared empty array (a fresh `?? []` each render would loop the panel-content effect — see the page-component skill).
const EMPTY_TASKS: schema.TaskWithLabels[] = [];

/**
 * Public (unauthenticated) post page: one centred 760px article column plus a "Details" drawer (`public-task-panel`:
 * Vote card, Details, Related posts). All live task/vote/membership state lives in `PublicTaskProvider`
 * (apps/start/src/contexts/ContextPublicOrgTask.tsx) so both this component and the panel
 * (apps/start/src/components/public/panels/task.tsx) read from context rather than one prop-drilling into the other.
 */
export function PublicTaskContent({ task: initialTask, release }: PublicTaskContentProps) {
	return (
		<PublicTaskProvider task={initialTask} release={release}>
			<PublicTaskContentInner />
		</PublicTaskProvider>
	);
}

function PostPageBar({ orgSlug }: { orgSlug: string }) {
	const panel = usePanel(PUBLIC_TASK_PANEL_ID);
	const { closePanel } = usePage();

	return (
		<div className="flex h-14 shrink-0 items-center justify-between border-portal-line border-b bg-portal-canvas px-2 md:h-11 md:px-3">
			<Link
				to="/orgs/$orgSlug"
				params={{ orgSlug }}
				className="inline-flex h-8 items-center gap-2 rounded-portal-sm px-2 font-medium text-[13.5px] text-portal-fg-2 outline-none transition-colors hover:bg-portal-hover hover:text-portal-fg focus-visible:bg-portal-hover focus-visible:text-portal-fg max-md:h-11 max-md:text-base"
			>
				<IconArrowLeft aria-hidden className="size-4" />
				Feedback
			</Link>
			<PortalButton
				variant="ghost"
				size="sm"
				aria-label={panel.isOpen ? "Hide details" : "Show details"}
				aria-pressed={panel.isOpen}
				className={cn("w-[30px] px-0 max-md:w-11", panel.isOpen && "bg-portal-raised text-portal-fg")}
				onClick={() =>
					panel.isOpen ? closePanel(PUBLIC_TASK_PANEL_ID) : sidebarActions.setOpen(PUBLIC_TASK_PANEL_ID, true)
				}
			>
				{panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
			</PortalButton>
		</div>
	);
}

function PublicTaskContentInner() {
	const { organization, tasks: contextTasks, categories } = usePublicOrganizationLayout();
	const { task, release, orgSlug, isMember, isVoted, voteCount, voteDisabled, handleVote } = usePublicTask();
	const { setPanelContent } = usePage();
	const panel = usePanel(PUBLIC_TASK_PANEL_ID);
	const { modal } = usePanelViewportDefaults(PUBLIC_TASK_PANEL_ID);

	// Fetch public tasks for this org if context tasks are empty (e.g., on direct task detail navigation) —
	// needed for the editor's #task mention list, Related posts, the parent check and sub-tasks.
	const {
		value: { data: fetchedTasks },
	} = useStateManagementFetch<schema.TaskWithLabels[]>({
		key: ["org-public-tasks", organization.id],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/tasks?org_id=${organization.id}&limit=200&include_closed=true`,
			custom: async (url) => {
				const res = await fetch(url);
				if (!res.ok) return [];
				const json = await res.json();
				return json.data ?? [];
			},
		},
		staleTime: 1000 * 60 * 5,
		enabled: contextTasks.length === 0,
	});

	const tasks = contextTasks.length > 0 ? contextTasks : (fetchedTasks ?? EMPTY_TASKS);

	// The Details drawer pulls live state from usePublicTask()/usePublicOrganizationLayout() itself, so it only needs
	// to be handed over once per `tasks` change. Memoised (not an inline literal) so the effect below does not loop.
	// Gated on isRegistered, not just mount: Page defers registering the panel to its client-only pass, so a plain
	// `[]`-effect here would race it and silently no-op.
	const panelContent = useMemo(() => <PublicTaskPanelContent tasks={tasks} />, [tasks]);
	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(PUBLIC_TASK_PANEL_ID, panelContent);
	}, [panel.isRegistered, setPanelContent, panelContent]);

	// Native drawer header (title + close button); members also get "Open internally".
	useEffect(() => {
		if (!panel.isRegistered) return;
		sidebarActions.setPanelHeader(PUBLIC_TASK_PANEL_ID, {
			title: "Details",
			actions: isMember ? <PublicTaskPanelHeaderActions /> : undefined,
		});
	}, [panel.isRegistered, isMember]);

	const { allComments } = usePostComments({ taskId: task.id, organizationId: task.organizationId });
	const latestUpdate = useMemo(() => getLatestUpdate(allComments, organization), [allComments, organization]);

	const category = categories.find((c) => c.id === task.category) ?? null;
	// Only link a parent that is known to be public (the loader's `parent` is not visibility-checked).
	const parent = task.parent && tasks.some((t) => t.id === task.parent?.id) ? task.parent : null;
	const subtasks = useMemo(
		() =>
			tasks
				.filter((t) => t.parentId === task.id)
				.sort((a, b) => (a.shortId ?? 0) - (b.shortId ?? 0))
				.map((t) => ({ id: t.id, shortId: t.shortId, title: t.title, status: t.status })),
		[tasks, task.id]
	);
	const creatorId = task.createdBy?.id ?? null;

	return (
		<Page
			header={<PostPageBar orgSlug={orgSlug} />}
			panels={{
				right: {
					id: PUBLIC_TASK_PANEL_ID,
					header: { title: "Details" },
					defaultOpen: true,
					width: "380px",
					modal,
				},
			}}
		>
			{/* min-h-full + flex pins the phone action bar to the bottom even when the post is shorter than the screen. */}
			<div className="flex min-h-full flex-col">
				<div className="mx-auto w-full max-w-[760px] flex-1 px-4 pt-6 pb-12 md:px-6 md:pt-10 md:pb-20">
					<article>
						<PostHeader
							task={task}
							orgShortId={organization.shortId}
							orgSlug={orgSlug}
							category={category}
							creatorIsTeam={isTeamMember(creatorId, organization)}
							parent={parent}
						/>

						<div className="flex flex-col gap-5">
							<PostStepperCard status={task.status} />
							<PostStatusBanner
								task={task}
								release={release}
								orgSlug={orgSlug}
								lastUpdateBy={latestUpdate?.createdBy ? getDisplayName(latestUpdate.createdBy) : null}
							/>
							{latestUpdate && (
								<LatestUpdateCard
									comment={latestUpdate}
									isAuthor={!!creatorId && latestUpdate.createdBy?.id === creatorId}
									tasks={tasks}
								/>
							)}
						</div>

						{task.description && (
							<div className={cn("mt-9", DESCRIPTION_PROSE)}>
								<Suspense fallback={<div className="h-20 animate-pulse rounded bg-portal-raised" />}>
									<Editor readonly={true} defaultContent={task.description} tasks={tasks} hideBlockHandle />
								</Suspense>
							</div>
						)}

						{task.githubIssue && <PostGithubCard githubIssue={task.githubIssue} className="mt-8" />}

						<PostSubtasks
							subtasks={subtasks}
							orgShortId={organization.shortId}
							orgSlug={orgSlug}
							className="mt-8"
						/>

						<hr className="mt-11 mb-7 border-portal-line" />

						<PublicComments
							taskId={task.id}
							organizationId={task.organizationId}
							taskStatus={task.status}
							tasks={tasks}
							authorId={creatorId}
						/>
					</article>
				</div>

				<PostBottomBar
					count={voteCount}
					voted={isVoted}
					disabled={voteDisabled}
					onToggleVote={handleVote}
					taskStatus={task.status}
				/>
			</div>
		</Page>
	);
}
