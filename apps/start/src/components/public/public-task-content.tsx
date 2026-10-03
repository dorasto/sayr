import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatTaskKey, getDisplayName, getInitials } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo } from "react";
import LoginDialog from "@/components/auth/login";
import { type BoardDataSource, BoardProvider } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import { FieldStatus } from "@/components/board/fields/field-status";
import { Page } from "@/components/generic/page";
import { usePage, usePanel } from "@/components/generic/use-page";
import { POST_COMMENT_COMPOSER_ID } from "@/components/public/portal/post/CommentComposer";
import { LatestUpdateCard } from "@/components/public/portal/post/LatestUpdateCard";
import { PostStatusBanner } from "@/components/public/portal/post/PostStatusBanner";
import { DESCRIPTION_PROSE } from "@/components/public/portal/post/prose";
import { useCanAct } from "@/components/public/portal/post/useCanAct";
import { usePostComments } from "@/components/public/portal/post/usePostComments";
import { Pill } from "@/components/public/portal/ui/Pill";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { VoteBox } from "@/components/public/portal/ui/VoteBox";
import { PublicTaskPanelHeaderActions } from "@/components/public/panels/public-task-panel-header-actions";
import { PublicTaskPanelContent } from "@/components/public/panels/task";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { formatShortDate } from "@/lib/portal/board-row";
import { getLatestUpdate } from "@/lib/portal/latest-update";
import { getPortalStatus } from "@/lib/portal/status";
import { isTeamMember } from "@/lib/portal/team";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PostPageBar } from "./post-page-bar";
import { PublicComments } from "./public-comments";

const Editor = lazy(() => import("@/components/prosekit/editor"));

export const PUBLIC_TASK_PANEL_ID = "public-task-panel";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

// Shared empty array (a fresh `?? []` each render would loop the panel-content effect — see the page-component skill).
const EMPTY_TASKS: schema.TaskWithLabels[] = [];

/** Scrolls the comment box into view and focuses its editor (the phone action bar's "Add a comment"). */
function focusComposer() {
	const composer = document.getElementById(POST_COMMENT_COMPOSER_ID);
	if (!composer) return;
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	composer.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
	composer.querySelector<HTMLElement>("[contenteditable='true']")?.focus({ preventScroll: true });
}

/**
 * Public (unauthenticated) post page: one centred 760px article column (votes from the chip beside the status, like
 * Peek) plus a "Details" drawer (`public-task-panel`: details, related posts). Must render inside `PublicTaskProvider`
 * (apps/start/src/contexts/ContextPublicOrgTask.tsx), which holds all live task/vote/membership state so both this
 * component and the panel (apps/start/src/components/public/panels/task.tsx) read from context rather than one
 * prop-drilling into the other.
 */
export function PublicTaskContent() {
	const { organization, tasks: contextTasks, categories, labels } = usePublicOrganizationLayout();
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

	const { allComments } = usePostComments({ taskId: task.id, organizationId: task.organizationId });
	const { isLoggedIn, canAct } = useCanAct(task.status);
	const latestUpdate = useMemo(() => getLatestUpdate(allComments, organization), [allComments, organization]);

	// The post's fields (status here, the rest in the Details panel) are the board's read-only `Field*` components.
	const boardData = useMemo<BoardDataSource>(
		() => ({ items: [task], labels, categories, releases: release ? [release] : [] }),
		[task, labels, categories, release]
	);
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
	const creator = task.createdBy;
	const creatorId = creator?.id ?? null;
	const creatorName = creator ? getDisplayName(creator) : null;

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

	return (
		<BoardProvider data={boardData} capabilities={READ_ONLY_CAPABILITIES}>
			<Page
				header={<PostPageBar orgSlug={orgSlug} panelId={PUBLIC_TASK_PANEL_ID} />}
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
					<div className="mx-auto w-full max-w-[760px] flex-1 px-4 pt-4 pb-12 md:px-6 md:pb-20">
						<article>
							<header className="flex flex-col gap-2">
								{parent?.shortId != null && (
									<Label variant="description" className="block">
										Part of{" "}
										<Link
											to="/orgs/$orgSlug/$shortId"
											params={{ orgSlug, shortId: String(parent.shortId) }}
											className="font-medium text-foreground hover:underline"
										>
											{formatTaskKey(organization.shortId, parent.shortId)}
											{parent.title ? ` ${parent.title}` : ""}
										</Link>
									</Label>
								)}
								{/* `!`: the global heading CSS is unlayered, so plain utilities would lose to its h1 size. */}
								<h1 className="font-bold! text-2xl! text-foreground tracking-normal!">{task.title}</h1>
							</header>

							{task.description && (
								<div className={cn("mt-4", DESCRIPTION_PROSE)}>
									<Suspense fallback={<Skeleton className="h-20" />}>
										<Editor readonly={true} defaultContent={task.description} tasks={tasks} hideBlockHandle />
									</Suspense>
								</div>
							)}

							<div className="mt-6 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
								<FieldStatus task={task} label={getPortalStatus(task.status).label} />
								{creator && creatorName && (
									<span className="inline-flex items-center gap-1.5">
										<Avatar className="size-5">
											{creator.image ? (
												<AvatarImage src={ensureCdnUrl(creator.image)} alt={creatorName} />
											) : null}
											<AvatarFallback className="text-[10px]">{getInitials(creatorName)}</AvatarFallback>
										</Avatar>
										<span className="font-medium text-foreground">{creatorName}</span>
									</span>
								)}
								{isTeamMember(creatorId, organization) && <Pill variant="team" />}
								{task.createdAt && (
									<time dateTime={new Date(task.createdAt).toISOString()}>
										{formatShortDate(task.createdAt)}
									</time>
								)}
								<span className="text-xs">{formatTaskKey(organization.shortId, task.shortId)}</span>
								{/* Phones vote from the sticky action bar at the bottom. */}
								<VoteBox
									count={voteCount}
									voted={isVoted}
									disabled={voteDisabled}
									onToggle={handleVote}
									size="chip"
									className="ml-auto max-md:hidden"
								/>
							</div>

							<div className="mt-6 flex flex-col gap-3 empty:hidden">
								<PostStatusBanner
									task={task}
									release={release}
									orgSlug={orgSlug}
									lastUpdateBy={latestUpdate?.createdBy ? getDisplayName(latestUpdate.createdBy) : null}
								/>
								{latestUpdate && <LatestUpdateCard comment={latestUpdate} tasks={tasks} />}
							</div>

							{subtasks.length > 0 && (
								<section aria-label="Sub-tasks" className="mt-8 flex flex-col gap-1">
									<Label variant="description" className="text-xs">
										Sub-tasks
									</Label>
									<ul className="flex flex-col gap-0.5">
										{subtasks.map((subtask) =>
											subtask.shortId != null ? (
												<li key={subtask.id}>
													<Link
														to="/orgs/$orgSlug/$shortId"
														params={{ orgSlug, shortId: String(subtask.shortId) }}
														className="flex items-center gap-2 rounded-lg border border-transparent p-1 text-sm transition-colors hover:border-border hover:bg-secondary focus-visible:border-border"
													>
														<StatusChip status={subtask.status} />
														<span className="shrink-0 text-muted-foreground text-xs">
															{formatTaskKey(organization.shortId, subtask.shortId)}
														</span>
														<span className="min-w-0 flex-1 truncate">{subtask.title ?? "Untitled"}</span>
													</Link>
												</li>
											) : null
										)}
									</ul>
								</section>
							)}

							<hr className="my-8 border-border" />

							<PublicComments
								taskId={task.id}
								taskShortId={task.shortId}
								organizationId={task.organizationId}
								taskStatus={task.status}
								tasks={tasks}
								authorId={creatorId}
							/>
						</article>
					</div>

					{/* Phone action bar: the vote toggle (never login-gated) beside Log in / Add a comment. */}
					<div className="sticky bottom-0 z-10 flex items-center gap-2.5 border-t bg-sidebar px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
						<VoteBox
							count={voteCount}
							voted={isVoted}
							disabled={voteDisabled}
							onToggle={handleVote}
							className="h-12 w-auto min-w-[76px] flex-row gap-1.5 rounded-lg px-4"
						/>
						{!isLoggedIn ? (
							<LoginDialog
								trigger={
									<Button size="lg" className="h-12 flex-1">
										Log in to comment
									</Button>
								}
							/>
						) : canAct ? (
							<Button size="lg" className="h-12 flex-1" onClick={focusComposer}>
								Add a comment
							</Button>
						) : null}
					</div>
				</div>
			</Page>
		</BoardProvider>
	);
}
