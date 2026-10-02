import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ensureCdnUrl, formatCount, formatDate, formatTaskKey, getDisplayName, getInitials } from "@repo/util";
import { IconArrowUpRight, IconChevronUp, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { Page } from "@/components/generic/page";
import RenderIcon from "@/components/generic/RenderIcon";
import { usePage, usePanel } from "@/components/generic/use-page";
import { DESCRIPTION_PROSE } from "@/components/public/portal/post/prose";
import { Pill } from "@/components/public/portal/ui/Pill";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { PublicReleaseDiscussion } from "@/components/public/releases/public-release-discussion";
import { PublicReleaseStatusUpdates } from "@/components/public/releases/public-release-status-updates";
import { LinkedGithubPRs } from "@/components/releases/linked-github-prs";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import {
	countUserPosts,
	getFirstParagraphText,
	getNotesAfterLede,
	getReleaseTint,
	orderReleaseTasks,
} from "@/lib/portal/release-page";
import { getReleaseProgress } from "@/lib/portal/release-progress";
import { findTeamMemberUser } from "@/lib/portal/team";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import type { Route } from "@/routes/orgs/$orgSlug/releases/$releaseSlug/index";
import { ReleaseDetailPanelContent } from "./ReleaseDetailPanel";
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
 * Public release page body: header (icon, version, status, date, name, lede), release notes, the task list, status
 * updates and discussion, plus the "Release details" drawer it fills.
 */
export function ReleaseDetailView({ release, tasks, orgId, orgSlug, statusUpdatesRefreshKey }: ReleaseDetailViewProps) {
	const { organization, tasks: contextTasks } = usePublicOrganizationLayout();
	const { setPanelContent } = usePage();
	const panel = usePanel(PUBLIC_RELEASE_DETAIL_PANEL_ID);
	const { modal } = usePanelViewportDefaults(PUBLIC_RELEASE_DETAIL_PANEL_ID);
	const isMember = useIsOrgMember(organization);

	// Won't do (`canceled`) tasks are not part of the release: the list, the progress and the user post count all use
	// the same set.
	const orderedTasks = useMemo(() => orderReleaseTasks(tasks, release.status), [tasks, release.status]);
	const progress = useMemo(() => getReleaseProgress(orderedTasks), [orderedTasks]);
	const lead = useMemo(() => findTeamMemberUser(release.leadId, organization), [release.leadId, organization]);
	const userPostCount = useMemo(() => countUserPosts(orderedTasks, organization), [orderedTasks, organization]);

	const lede = useMemo(() => getFirstParagraphText(release.description), [release.description]);
	const notes = useMemo(() => getNotesAfterLede(release.description), [release.description]);

	// The drawer is plain props, so it is memoised once per input change (an inline literal in the effect's deps would
	// re-fire it every render — see the page-component skill). Gated on isRegistered: Page registers panels in its
	// client-only pass, so a plain mount effect would race it and silently no-op.
	const panelContent = useMemo(
		() => (
			<ReleaseDetailPanelContent
				release={release}
				progress={progress}
				lead={lead}
				userPostCount={userPostCount}
				pullRequests={
					<LinkedGithubPRs
						organizationId={organization.id}
						releaseId={release.id}
						githubPR={release.githubPullRequests?.[0] || null}
						editable={false}
					/>
				}
			/>
		),
		[release, progress, lead, userPostCount, organization.id]
	);

	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(PUBLIC_RELEASE_DETAIL_PANEL_ID, panelContent);
	}, [panel.isRegistered, setPanelContent, panelContent]);

	// Native drawer header (title + close button); members also get "Open internally".
	useEffect(() => {
		if (!panel.isRegistered) return;
		sidebarActions.setPanelHeader(PUBLIC_RELEASE_DETAIL_PANEL_ID, {
			title: "Release details",
			actions:
				isMember && orgId ? (
					<a
						href={`${import.meta.env.VITE_URL_ROOT}/${orgId}/releases/${release.slug}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground text-xs outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground"
					>
						<IconArrowUpRight aria-hidden className="size-3.5" />
						Open internally
					</a>
				) : undefined,
		});
	}, [panel.isRegistered, isMember, orgId, release.slug]);

	const tint = getReleaseTint(release.color);
	const { prefix, date } = getReleaseDisplayDate(release);

	return (
		<Page
			header={<ReleasePageBar orgSlug={orgSlug} panelId={PUBLIC_RELEASE_DETAIL_PANEL_ID} />}
			panels={{
				right: {
					id: PUBLIC_RELEASE_DETAIL_PANEL_ID,
					header: { title: "Release details" },
					defaultOpen: true,
					width: "380px",
					modal,
				},
			}}
		>
			<div className="mx-auto w-full max-w-[760px] px-4 pt-6 pb-12 md:px-6 md:pt-10 md:pb-20">
				<header>
					<div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
						<span
							aria-hidden
							className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
							style={
								tint ? { background: `color-mix(in oklch, ${tint} 16%, transparent)`, color: tint } : undefined
							}
						>
							{release.icon ? (
								<RenderIcon iconName={release.icon} size={24} raw color="currentColor" />
							) : (
								<IconRocket className="size-6" stroke={1.8} />
							)}
						</span>
						<Pill variant="gh" className="h-[26px] text-[13px]">
							{release.slug}
						</Pill>
						<ReleaseStatusChip status={release.status} />
						{date && (
							<span className="text-[13.5px] text-muted-foreground">
								{prefix} {formatDate(date, "en-GB")}
							</span>
						)}
					</div>
					<h1 className="font-bold text-[28px] text-foreground leading-[34px] tracking-[-0.03em] md:text-4xl md:leading-[42px] md:tracking-[-0.032em]">
						{release.name}
					</h1>
					{lede && <p className="mt-3 max-w-[640px] text-[15px] text-muted-foreground leading-6">{lede}</p>}
				</header>

				{notes && (
					<section className="mt-10">
						<SectionHeading>Release notes</SectionHeading>
						<div className={DESCRIPTION_PROSE}>
							<Suspense fallback={<div className="h-20 animate-pulse rounded bg-muted" />}>
								<Editor readonly defaultContent={notes} tasks={contextTasks} hideBlockHandle />
							</Suspense>
						</div>
					</section>
				)}

				<section className="mt-11">
					<SectionHeading count={progress.total}>What is in it</SectionHeading>
					<div className="overflow-hidden rounded-xl border bg-card">
						{orderedTasks.length === 0 && (
							<p className="px-5 py-8 text-center text-[13.5px] text-muted-foreground">
								No public posts are linked to this release yet.
							</p>
						)}
						{orderedTasks.map((task) => {
							const assignee = task.assignees[0];
							const row = (
								<>
									<span className="min-w-[58px] rounded-md bg-muted px-1.5 py-px text-center font-semibold text-[12.5px] text-muted-foreground">
										{task.shortId != null ? formatTaskKey(organization.shortId, task.shortId) : "—"}
									</span>
									<span className="min-w-0 flex-1 truncate font-medium text-[14.5px] text-foreground">
										{task.title || "Untitled post"}
									</span>
									<StatusChip status={task.status} className="hidden shrink-0 sm:inline-flex" />
									<span className="hidden w-11 shrink-0 items-center gap-1 text-[13px] text-muted-foreground tabular-nums sm:inline-flex">
										<IconChevronUp aria-hidden className="size-3.5" stroke={2.4} />
										{formatCount(task.voteCount)}
									</span>
									<span className="hidden w-6 shrink-0 justify-end sm:flex">
										{assignee && (
											<Avatar className="size-6">
												<AvatarImage
													src={assignee.image ? ensureCdnUrl(assignee.image) : undefined}
													alt={getDisplayName(assignee)}
												/>
												<AvatarFallback className="text-xs">
													{getInitials(getDisplayName(assignee))}
												</AvatarFallback>
											</Avatar>
										)}
									</span>
								</>
							);

							return task.shortId != null ? (
								<Link
									key={task.id}
									to="/orgs/$orgSlug/$shortId"
									params={{ orgSlug, shortId: String(task.shortId) }}
									className="flex h-14 items-center gap-3.5 border-t px-4 transition-colors first:border-t-0 hover:bg-accent focus-visible:bg-accent sm:px-5"
								>
									{row}
								</Link>
							) : (
								<div
									key={task.id}
									className="flex h-14 items-center gap-3.5 border-t px-4 transition-colors first:border-t-0 hover:bg-accent focus-visible:bg-accent sm:px-5"
								>
									{row}
								</div>
							);
						})}
					</div>
				</section>

				<div className="mt-12">
					<PublicReleaseStatusUpdates
						organizationId={orgId}
						orgSlug={orgSlug}
						releaseSlug={release.slug}
						releaseId={release.id}
						refreshKey={statusUpdatesRefreshKey}
					/>
				</div>

				<hr className="mt-11 mb-7 border-border" />

				<section>
					<SectionHeading>Discussion</SectionHeading>
					<PublicReleaseDiscussion
						releaseId={release.id}
						releaseSlug={release.slug}
						organizationId={orgId}
						orgSlug={orgSlug}
					/>
				</section>
			</div>
		</Page>
	);
}
