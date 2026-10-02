import { db, getOrganizationPublic, getReleaseBySlug, schema } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatCount, formatDate, formatTaskKey, getDisplayName, getInitials } from "@repo/util";
import {
	IconArrowLeft,
	IconArrowUpRight,
	IconChevronUp,
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
	IconRocket,
} from "@tabler/icons-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Page } from "@/components/generic/page";
import RenderIcon from "@/components/generic/RenderIcon";
import { usePage, usePanel } from "@/components/generic/use-page";
import { DESCRIPTION_PROSE } from "@/components/public/portal/post/prose";
import { ReleaseDetailPanelContent } from "@/components/public/portal/releases/ReleaseDetailPanel";
import { ReleaseStatusChip } from "@/components/public/portal/releases/ReleaseStatusChip";
import { Pill } from "@/components/public/portal/ui/Pill";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { PublicReleaseDiscussion } from "@/components/public/releases/public-release-discussion";
import { PublicReleaseStatusUpdates } from "@/components/public/releases/public-release-status-updates";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { LinkedGithubPRs } from "@/components/releases/linked-github-prs";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
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
import type { ServerEventMessage } from "@/lib/serverEvents";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { getOgImageUrl, seo } from "@/seo";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const fetchPublicRelease = createServerFn({ method: "GET" })
	.inputValidator((data: { orgSlug: string; releaseSlug: string }) => data)
	.handler(async ({ data }) => {
		// Resolve system org for single-tenant installs
		const { multiTenantEnabled } = getEditionCapabilities();
		let resolvedSlug = data.orgSlug;

		if (!multiTenantEnabled) {
			const systemOrg = await db.query.organization.findFirst({
				where: (o, { eq }) => eq(o.isSystemOrg, true),
				columns: { slug: true },
			});
			if (systemOrg?.slug) resolvedSlug = systemOrg.slug;
		}

		const org = await getOrganizationPublic(resolvedSlug);
		if (!org?.settings?.enablePublicPage) return { release: null, tasks: [], org: null };

		const release = await getReleaseBySlug(org.id, data.releaseSlug);
		if (!release) return { release: null, tasks: [], org: null };

		// Fetch only public tasks for this release
		const rawTasks = await db.query.task.findMany({
			where: and(eq(schema.task.releaseId, release.id), eq(schema.task.visible, "public")),
			with: {
				labels: { with: { label: true } },
				assignees: {
					with: {
						user: {
							columns: { id: true, name: true, image: true, createdAt: true },
						},
					},
				},
			},
			orderBy: (t, { asc }) => asc(t.createdAt),
		});

		const tasks = rawTasks.map((task) => ({
			...task,
			labels: task.labels.map((l) => l.label),
			assignees: task.assignees.map((a) => a.user),
		}));

		return {
			release,
			tasks,
			org: { id: org.id, name: org.name, logo: org.logo },
		};
	});

export const Route = createFileRoute("/orgs/$orgSlug/releases/$releaseSlug/")({
	loader: async ({ params, context }) =>
		fetchPublicRelease({
			data: {
				orgSlug: (context as { systemSlug?: string | null })?.systemSlug || params.orgSlug,
				releaseSlug: params.releaseSlug,
			},
		}),
	head: ({ loaderData }) => {
		// Build task status counts for OG stats pills
		const statsMap: Record<string, number> = {};
		for (const task of loaderData?.tasks ?? []) {
			if (task.status) {
				statsMap[task.status] = (statsMap[task.status] ?? 0) + 1;
			}
		}
		const stats = Object.entries(statsMap).map(([status, count]) => ({
			status,
			count,
		}));

		return {
			meta: seo({
				title: loaderData?.release?.name ?? "Release",
				image: loaderData?.release
					? getOgImageUrl({
							title: loaderData.release.name,
							subtitle: loaderData.release.status
								? getReleaseStatusConfig(loaderData.release.status).label
								: undefined,
							meta: loaderData.org?.name || undefined,
							logo: loaderData.org?.logo || undefined,
							stats: stats.length > 0 ? stats : undefined,
						})
					: undefined,
			}),
		};
	},
	component: ReleaseDetailPage,
});

const PUBLIC_RELEASE_DETAIL_PANEL_ID = "public-release-detail-panel";

function ReleaseDetailPage() {
	const { release, tasks, org } = Route.useLoaderData();
	const params = Route.useParams();
	const orgSlug = params.orgSlug;
	const router = useRouter();
	const { serverEvents, organization } = usePublicOrganizationLayout();
	const [statusUpdatesRefreshKey, setStatusUpdatesRefreshKey] = useState(0);

	// SSE handlers for real-time release updates
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_RELEASES: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
				router.invalidate();
			}
		},
		UPDATE_TASK: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
				router.invalidate();
			}
		},
		UPDATE_RELEASE_STATUS_UPDATES: (msg) => {
			if (
				msg.scope === "PUBLIC" &&
				msg.meta?.orgId === organization.id &&
				(msg.data as { releaseId?: string })?.releaseId === release?.id
			) {
				setStatusUpdatesRefreshKey((k) => k + 1);
			}
		},
	};
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);

	// Attach SSE listener
	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	// Handle SSE reconnection — refetch all data
	useEffect(() => {
		const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
			if (msg.type === "SSE_RECONNECTED") {
				router.invalidate();
			}
		});
		return unsubscribe;
	}, [router]);

	// `release` can flip falsy on a mounted instance (every SSE handler above invalidates the loader, which returns a
	// null release if it was deleted or the org turned its public page off). Everything with hooks that depend on a
	// release lives in `ReleaseDetailView`, so this early return never changes a hook count.
	if (!release) return <ReleaseNotFound orgSlug={orgSlug} />;

	return (
		<ReleaseDetailView
			release={release}
			tasks={tasks}
			orgId={org?.id ?? ""}
			orgSlug={orgSlug}
			statusUpdatesRefreshKey={statusUpdatesRefreshKey}
		/>
	);
}

function ReleaseNotFound({ orgSlug }: { orgSlug: string }) {
	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto flex w-full max-w-[1120px] justify-center px-4 py-24 md:px-6">
				<div className="mx-auto flex max-w-[340px] flex-col items-center text-center">
					<span
						aria-hidden
						className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
					>
						<IconRocket className="size-6" />
					</span>
					<div className="font-semibold text-base text-foreground">Release not found</div>
					<p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">
						It may have been removed, or the link is wrong.
					</p>
					<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
						<Link
							to="/orgs/$orgSlug/releases"
							params={{ orgSlug }}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							Back to the changelog
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

function ReleasePageBar({ orgSlug }: { orgSlug: string }) {
	const panel = usePanel(PUBLIC_RELEASE_DETAIL_PANEL_ID);
	const { closePanel } = usePage();

	return (
		<div className="flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-2 md:h-11 md:px-3">
			<Link
				to="/orgs/$orgSlug/releases"
				params={{ orgSlug }}
				className="inline-flex h-8 items-center gap-2 rounded-md px-2 font-medium text-[13.5px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground max-md:h-11 max-md:text-base"
			>
				<IconArrowLeft aria-hidden className="size-4" />
				Changelog
			</Link>
			<Button
				variant="ghost"
				size="icon"
				aria-label={panel.isOpen ? "Hide progress and details" : "Show progress and details"}
				aria-pressed={panel.isOpen}
				className={cn("size-[30px] max-md:size-11", panel.isOpen && "bg-muted text-foreground")}
				onClick={() =>
					panel.isOpen
						? closePanel(PUBLIC_RELEASE_DETAIL_PANEL_ID)
						: sidebarActions.setOpen(PUBLIC_RELEASE_DETAIL_PANEL_ID, true)
				}
			>
				{panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
			</Button>
		</div>
	);
}

function SectionHeading({ children, count }: { children: string; count?: number }) {
	return (
		<h2 className="mb-4 font-semibold text-foreground text-xl leading-7 tracking-[-0.018em]">
			{children}
			{count !== undefined && (
				<span className="ml-2 font-medium text-muted-foreground text-sm tracking-normal">{count}</span>
			)}
		</h2>
	);
}

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

function ReleaseDetailView({ release, tasks, orgId, orgSlug, statusUpdatesRefreshKey }: ReleaseDetailViewProps) {
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
	const tint = getReleaseTint(release.color);
	const { prefix, date } = getReleaseDisplayDate(release);

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

	return (
		<Page
			header={<ReleasePageBar orgSlug={orgSlug} />}
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
							const rowClassName =
								"flex h-14 items-center gap-3.5 border-t px-4 transition-colors first:border-t-0 hover:bg-accent focus-visible:bg-accent sm:px-5";
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
									className={rowClassName}
								>
									{row}
								</Link>
							) : (
								<div key={task.id} className={rowClassName}>
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
