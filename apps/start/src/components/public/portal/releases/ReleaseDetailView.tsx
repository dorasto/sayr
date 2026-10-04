import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatCount, formatDate, formatTaskKey, getDisplayName, getInitials } from "@repo/util";
import { IconArrowUpRight, IconChevronUp, IconRocket } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { Page } from "@/components/generic/page";
import RenderIcon from "@/components/generic/RenderIcon";
import { usePage, usePanel } from "@/components/generic/use-page";
import { DESCRIPTION_PROSE } from "@/components/public/portal/post/prose";
import { SegmentedProgress } from "@/components/public/portal/ui/SegmentedProgress";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { PublicReleaseDiscussion } from "@/components/public/releases/public-release-discussion";
import { PublicReleaseStatusUpdates } from "@/components/public/releases/public-release-status-updates";
import { LinkedGithubPRs } from "@/components/releases/linked-github-prs";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { useReleaseActivity } from "@/hooks/portal/useReleaseActivity";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import { getReleaseTint, orderReleaseTasks } from "@/lib/portal/release-page";
import { getReleaseProgress } from "@/lib/portal/release-progress";
import { findTeamMemberUser } from "@/lib/portal/team";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import type { Route } from "@/routes/orgs/$orgSlug/releases/$releaseSlug/index";
import { ReleaseDetailPanelContent } from "./ReleaseDetailPanel";
import { ReleaseHealth } from "./ReleaseHealth";
import { ReleasePageBar } from "./ReleasePageBar";
import { ReleaseStatusChip } from "./ReleaseStatusChip";
import { SectionHeading } from "./SectionHeading";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const PUBLIC_RELEASE_DETAIL_PANEL_ID = "public-release-detail-panel";

/** A public release task as the loader returns it (the "no release" branch returns `[]`, hence the explicit type). */
interface ReleaseViewTask {
	id: string;
	shortId: number | null;
	title: string | null;
	status: string;
	voteCount: number;
	assignees: ReadonlyArray<{ id: string; name: string; image: string | null; displayName?: string | null }>;
	createdBy: string | null;
	labels: schema.labelType[];
}

interface ReleaseDetailViewProps {
	release: NonNullable<ReturnType<typeof Route.useLoaderData>["release"]>;
	tasks: ReadonlyArray<ReleaseViewTask>;
	orgId: string;
	orgSlug: string;
	statusUpdatesRefreshKey: number;
}

/**
 * Public release page, laid out like a post page: the same bar (back to the Changelog + drawer toggle), one prose-width
 * column (status/health/date over the name, the notes, the version with a progress bar, the posts in it, status updates,
 * discussion) and a "Details · <version>" drawer of label/value rows with progress and labels.
 */
export function ReleaseDetailView({ release, tasks, orgId, orgSlug, statusUpdatesRefreshKey }: ReleaseDetailViewProps) {
	const { organization, tasks: contextTasks } = usePublicOrganizationLayout();
	const { setPanelContent } = usePage();
	const panel = usePanel(PUBLIC_RELEASE_DETAIL_PANEL_ID);
	const { modal } = usePanelViewportDefaults(PUBLIC_RELEASE_DETAIL_PANEL_ID);
	const isMember = useIsOrgMember(organization);
	const queryClient = useQueryClient();
	const activity = useReleaseActivity(orgSlug, release.slug);

	// Won't do (`canceled`) tasks are not part of the release: the list, the progress and the user post count all use
	// the same set.
	const orderedTasks = useMemo(() => orderReleaseTasks(tasks, release.status), [tasks, release.status]);
	const progress = useMemo(() => getReleaseProgress(orderedTasks), [orderedTasks]);
	const lead = useMemo(() => findTeamMemberUser(release.leadId, organization), [release.leadId, organization]);
	const health = activity?.health ?? null;

	// A new or edited status update (the route bumps `statusUpdatesRefreshKey`) can change the health shown here too.
	const lastRefreshKey = useRef(statusUpdatesRefreshKey);
	useEffect(() => {
		if (lastRefreshKey.current === statusUpdatesRefreshKey) return;
		lastRefreshKey.current = statusUpdatesRefreshKey;
		void queryClient.invalidateQueries({ queryKey: ["public-release-status-updates", orgSlug, release.slug] });
	}, [statusUpdatesRefreshKey, queryClient, orgSlug, release.slug]);

	// The drawer is plain props, so it is memoised once per input change (an inline literal in the effect's deps would
	// re-fire it every render — see the page-component skill). Gated on isRegistered: Page registers panels in its
	// client-only pass, so a plain mount effect would race it and silently no-op.
	const githubPR = release.githubPullRequests?.[0] ?? null;
	const panelContent = useMemo(
		() => (
			<ReleaseDetailPanelContent
				release={release}
				progress={progress}
				health={health}
				lead={lead}
				pullRequest={
					githubPR ? (
						<LinkedGithubPRs
							organizationId={organization.id}
							releaseId={release.id}
							githubPR={githubPR}
							editable={false}
						/>
					) : undefined
				}
			/>
		),
		[release, progress, health, lead, githubPR, organization.id]
	);

	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(PUBLIC_RELEASE_DETAIL_PANEL_ID, panelContent);
	}, [panel.isRegistered, setPanelContent, panelContent]);

	// Native drawer header, like the post page's "Details · SAY-n"; members also get "Open internally".
	const panelTitle = `Details · ${release.slug}`;
	useEffect(() => {
		if (!panel.isRegistered) return;
		sidebarActions.setPanelHeader(PUBLIC_RELEASE_DETAIL_PANEL_ID, {
			title: panelTitle,
			actions:
				isMember && orgId ? (
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 gap-2 p-1"
						aria-label="Open internally"
						tooltipText="Open in the admin app"
						tooltipSide="bottom"
						nativeButton={false}
						render={
							// biome-ignore lint/a11y/useAnchorContent: the Button supplies the icon and aria-label
							<a
								href={`${import.meta.env.VITE_URL_ROOT}/${orgId}/releases/${release.slug}`}
								target="_blank"
								rel="noopener noreferrer"
							/>
						}
					>
						<IconArrowUpRight aria-hidden />
					</Button>
				) : undefined,
		});
	}, [panel.isRegistered, panelTitle, isMember, orgId, release.slug]);

	const panels = useMemo(
		() => ({
			right: {
				id: PUBLIC_RELEASE_DETAIL_PANEL_ID,
				header: { title: panelTitle },
				defaultOpen: true,
				width: "380px",
				modal,
			},
		}),
		[panelTitle, modal]
	);

	const tint = getReleaseTint(release.color);
	const { prefix, date } = getReleaseDisplayDate(release);
	const progressLabel =
		progress.total === 0
			? null
			: progress.done === progress.total
				? `All ${progress.total} ${progress.total === 1 ? "post" : "posts"} done`
				: `${progress.done} of ${progress.total} ${progress.total === 1 ? "post" : "posts"} done`;

	return (
		<Page header={<ReleasePageBar orgSlug={orgSlug} panelId={PUBLIC_RELEASE_DETAIL_PANEL_ID} />} panels={panels}>
			<div className="mx-auto w-full max-w-prose px-4 pt-4 pb-12 md:px-6 md:pb-20">
				<article>
					<header className="flex flex-col gap-2">
						<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-muted-foreground text-sm">
							<span
								aria-hidden
								className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"
								style={
									tint
										? { background: `color-mix(in oklch, ${tint} 16%, transparent)`, color: tint }
										: undefined
								}
							>
								{release.icon ? (
									<RenderIcon iconName={release.icon} size={14} raw color="currentColor" />
								) : (
									<IconRocket className="size-3.5" stroke={2} />
								)}
							</span>
							<ReleaseStatusChip status={release.status} />
							{release.status !== "released" && <ReleaseHealth health={activity?.health} />}
							{date && (
								<time dateTime={date.toISOString()}>
									{prefix} {formatDate(date, "en-GB")}
								</time>
							)}
						</div>
						{/* `!`: the global heading CSS is unlayered, so plain utilities would lose to its h1 size. */}
						<h1 className="font-bold! text-2xl! text-foreground tracking-normal!">{release.name}</h1>
					</header>

					{release.description && (
						<div className={cn("mt-4", DESCRIPTION_PROSE)}>
							<Suspense fallback={<Skeleton className="h-20" />}>
								<Editor readonly defaultContent={release.description} tasks={contextTasks} hideBlockHandle />
							</Suspense>
						</div>
					)}

					<div className="mt-6 flex items-center gap-3 text-muted-foreground text-xs">
						<span className="shrink-0 font-mono">{release.slug}</span>
						{progressLabel && (
							<>
								<SegmentedProgress
									className="h-1.5 flex-1"
									label={progressLabel}
									segments={[
										{ value: progress.done, tone: "ok" },
										{ value: progress.inProgress, tone: "accent" },
										{ value: progress.planned, tone: "muted" },
									]}
								/>
								<span className="shrink-0 tabular-nums">{progressLabel}</span>
							</>
						)}
					</div>

					<section aria-label="What's in it" className="mt-10">
						<SectionHeading count={orderedTasks.length}>What's in it</SectionHeading>
						{orderedTasks.length === 0 ? (
							<p className="text-muted-foreground text-sm">No public posts are linked to this release yet.</p>
						) : (
							<ul className="flex flex-col gap-0.5">
								{orderedTasks.map((task) => (
									<li key={task.id}>
										<ReleaseTaskRow task={task} orgSlug={orgSlug} orgShortId={organization.shortId} />
									</li>
								))}
							</ul>
						)}
					</section>

					<div className="mt-10 empty:hidden">
						<PublicReleaseStatusUpdates
							organizationId={orgId}
							orgSlug={orgSlug}
							releaseSlug={release.slug}
							releaseId={release.id}
							refreshKey={statusUpdatesRefreshKey}
						/>
					</div>

					<hr className="my-8 border-border" />

					<section>
						<SectionHeading>Discussion</SectionHeading>
						<PublicReleaseDiscussion
							releaseId={release.id}
							releaseSlug={release.slug}
							organizationId={orgId}
							orgSlug={orgSlug}
						/>
					</section>
				</article>
			</div>
		</Page>
	);
}

const ROW_CLASS =
	"flex items-center gap-2 rounded-lg border border-transparent p-1 text-sm transition-colors hover:border-border hover:bg-secondary focus-visible:border-border";

/** One post in "What's in it", styled like the post page's sub-task rows: key, title, status, votes and assignee (fixed-width
 * columns either side of the title so the rows line up). */
function ReleaseTaskRow({ task, orgSlug, orgShortId }: { task: ReleaseViewTask; orgSlug: string; orgShortId: string }) {
	const assignee = task.assignees[0];
	const content = (
		<>
			<span className="w-14 shrink-0 pl-1 text-muted-foreground text-xs tabular-nums">
				{task.shortId != null ? formatTaskKey(orgShortId, task.shortId) : ""}
			</span>
			<span className="min-w-0 flex-1 truncate">{task.title || "Untitled post"}</span>
			<StatusChip status={task.status} className="shrink-0" />
			<span className="hidden w-10 shrink-0 items-center justify-end gap-0.5 text-muted-foreground text-xs tabular-nums sm:inline-flex">
				<IconChevronUp aria-hidden className="size-3.5" />
				{formatCount(task.voteCount)}
				<span className="sr-only">{task.voteCount === 1 ? "vote" : "votes"}</span>
			</span>
			<span className="hidden w-5 shrink-0 justify-end sm:flex">
				{assignee && (
					<Avatar className="size-5">
						<AvatarImage
							src={assignee.image ? ensureCdnUrl(assignee.image) : undefined}
							alt={getDisplayName(assignee)}
						/>
						<AvatarFallback className="text-[10px]">{getInitials(getDisplayName(assignee))}</AvatarFallback>
					</Avatar>
				)}
			</span>
		</>
	);

	return task.shortId != null ? (
		<Link to="/orgs/$orgSlug/$shortId" params={{ orgSlug, shortId: String(task.shortId) }} className={ROW_CLASS}>
			{content}
		</Link>
	) : (
		<div className={ROW_CLASS}>{content}</div>
	);
}
