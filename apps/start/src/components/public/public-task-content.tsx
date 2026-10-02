import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDate, formatTaskKey, getDisplayName, getInitials } from "@repo/util";
import { IconArrowUpRight, IconBrandGithub } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo } from "react";
import LoginDialog from "@/components/auth/login";
import { Page } from "@/components/generic/page";
import { usePage, usePanel } from "@/components/generic/use-page";
import { POST_COMMENT_COMPOSER_ID } from "@/components/public/portal/post/CommentComposer";
import { LatestUpdateCard } from "@/components/public/portal/post/LatestUpdateCard";
import { PostStatusBanner } from "@/components/public/portal/post/PostStatusBanner";
import { DESCRIPTION_PROSE } from "@/components/public/portal/post/prose";
import { useCanAct } from "@/components/public/portal/post/useCanAct";
import { usePostComments } from "@/components/public/portal/post/usePostComments";
import { CategoryTag } from "@/components/public/portal/ui/CategoryTag";
import { Pill } from "@/components/public/portal/ui/Pill";
import { Stepper } from "@/components/public/portal/ui/Stepper";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { VoteBox } from "@/components/public/portal/ui/VoteBox";
import { PublicTaskPanelHeaderActions } from "@/components/public/panels/public-task-panel-header-actions";
import { PublicTaskPanelContent } from "@/components/public/panels/task";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { parseGithubIssueUrl } from "@/lib/portal/github-issue";
import { getLatestUpdate } from "@/lib/portal/latest-update";
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
 * Public (unauthenticated) post page: one centred 760px article column plus a "Details" drawer (`public-task-panel`:
 * Vote card, Details, Related posts). Must render inside `PublicTaskProvider`
 * (apps/start/src/contexts/ContextPublicOrgTask.tsx), which holds all live task/vote/membership state so both this
 * component and the panel (apps/start/src/components/public/panels/task.tsx) read from context rather than one
 * prop-drilling into the other.
 */
export function PublicTaskContent() {
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

	const { allComments } = usePostComments({ taskId: task.id, organizationId: task.organizationId });
	const { isLoggedIn, canAct } = useCanAct(task.status);
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
	const creator = task.createdBy;
	const creatorId = creator?.id ?? null;
	const creatorName = creator ? getDisplayName(creator) : null;
	const githubParsed = task.githubIssue ? parseGithubIssueUrl(task.githubIssue.issueUrl) : null;
	const githubReference = githubParsed
		? `${githubParsed.repo}#${githubParsed.number}`
		: `#${task.githubIssue?.issueNumber}`;

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
				<div className="mx-auto w-full max-w-[760px] flex-1 px-4 pt-6 pb-12 md:px-6 md:pt-10 md:pb-20">
					<article>
						<header>
							<div className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
								<StatusChip status={task.status} />
								{category && <CategoryTag category={category} />}
								<span className="text-[13px] text-muted-foreground">
									{formatTaskKey(organization.shortId, task.shortId)}
								</span>
							</div>

							{parent?.shortId != null && (
								<p className="mb-2 text-[13.5px] text-muted-foreground">
									Part of{" "}
									<Link
										to="/orgs/$orgSlug/$shortId"
										params={{ orgSlug, shortId: String(parent.shortId) }}
										className="font-medium text-primary hover:underline"
									>
										{formatTaskKey(organization.shortId, parent.shortId)}
										{parent.title ? ` ${parent.title}` : ""}
									</Link>
								</p>
							)}

							<h1 className="font-bold text-[28px] text-foreground leading-[34px] tracking-[-0.03em] md:text-4xl md:leading-[42px] md:tracking-[-0.032em]">
								{task.title}
							</h1>

							<div className="mt-4 mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13.5px] text-muted-foreground md:mt-[18px] md:mb-7 md:text-sm">
								{creator && creatorName && (
									<>
										<Avatar className="size-7">
											{creator.image ? (
												<AvatarImage src={ensureCdnUrl(creator.image)} alt={creatorName} />
											) : null}
											<AvatarFallback className="text-xs font-semibold">
												{getInitials(creatorName)}
											</AvatarFallback>
										</Avatar>
										<b className="font-semibold text-foreground">{creatorName}</b>
										<Pill variant="author" />
										{isTeamMember(creatorId, organization) && <Pill variant="team" />}
									</>
								)}
								{task.createdAt && (
									<span>
										posted{" "}
										<time dateTime={new Date(task.createdAt).toISOString()}>
											{formatDate(task.createdAt, "en-GB")}
										</time>
									</span>
								)}
							</div>
						</header>

						<div className="flex flex-col gap-5">
							{task.status !== "canceled" && (
								<div className="rounded-xl border bg-card px-4 pt-[18px] pb-3 md:px-7 md:pt-[22px] md:pb-[18px]">
									<Stepper status={task.status} />
								</div>
							)}
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
								<Suspense fallback={<Skeleton className="h-20" />}>
									<Editor readonly={true} defaultContent={task.description} tasks={tasks} hideBlockHandle />
								</Suspense>
							</div>
						)}

						{task.githubIssue && (
							<div className="mt-8 flex items-center gap-3.5 rounded-xl border bg-card px-[18px] py-3.5">
								<span
									aria-hidden
									className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
								>
									<IconBrandGithub className="size-5" />
								</span>
								<div className="min-w-0 flex-1">
									<div className="font-semibold text-foreground text-sm">Tracked on GitHub</div>
									<div className="truncate text-[13px] text-muted-foreground">{githubReference}</div>
								</div>
								<a
									href={task.githubIssue.issueUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={buttonVariants({ variant: "outline", size: "sm" })}
								>
									View issue
									<IconArrowUpRight aria-hidden />
								</a>
							</div>
						)}

						{subtasks.length > 0 && (
							<section aria-labelledby="post-subtasks-heading" className="mt-8">
								<h2 id="post-subtasks-heading" className="mb-2 font-semibold text-[15px] text-foreground">
									Sub-tasks
								</h2>
								<ul className="overflow-hidden rounded-xl border bg-card">
									{subtasks.map((subtask) => (
										<li key={subtask.id} className="border-t first:border-t-0">
											{subtask.shortId != null ? (
												<Link
													to="/orgs/$orgSlug/$shortId"
													params={{ orgSlug, shortId: String(subtask.shortId) }}
													className="flex min-h-11 items-center gap-3 px-4 py-2 transition-colors hover:bg-accent"
												>
													<span className="shrink-0 text-[13px] text-muted-foreground">
														{formatTaskKey(organization.shortId, subtask.shortId)}
													</span>
													<span className="min-w-0 flex-1 truncate font-medium text-sm text-foreground">
														{subtask.title ?? "Untitled"}
													</span>
													<StatusChip status={subtask.status} />
												</Link>
											) : null}
										</li>
									))}
								</ul>
							</section>
						)}

						<hr className="mt-11 mb-7 border-border" />

						<PublicComments
							taskId={task.id}
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
	);
}
