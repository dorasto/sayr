import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getDisplayName } from "@repo/util";
import { IconArrowRight, IconArrowUpRight, IconBrandGithub, IconLink, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePostPublicUrl } from "@/hooks/portal/usePostPublicUrl";
import { formatShortDate } from "@/lib/portal/board-row";
import { getLatestUpdate } from "@/lib/portal/latest-update";
import { fullPostLinkLabel, type PeekPost } from "@/lib/portal/peek";
import { isTeamMember } from "@/lib/portal/team";
import { toDate } from "@/lib/portal/time";
import type { PanelHeaderConfig } from "@/lib/sidebar/sidebar-store";
import { useBoardVote } from "../board/useBoardVote";
import { useBoardReleases } from "../board/useBoardSideData";
import { LatestUpdateCard } from "../post/LatestUpdateCard";
import { PostCommentComposer } from "../post/CommentComposer";
import { PostStatusBanner } from "../post/PostStatusBanner";
import { PostStepperCard } from "../post/PostStepperCard";
import { DESCRIPTION_PROSE } from "../post/prose";
import { usePostComments } from "../post/usePostComments";
import { CategoryTag } from "../ui/CategoryTag";
import { Pill } from "../ui/Pill";
import { PortalAvatar } from "../ui/PortalAvatar";
import { PortalButton, portalButtonVariants } from "../ui/PortalButton";
import { ReleaseTag } from "../ui/ReleaseTag";
import { StatusChip } from "../ui/StatusChip";
import { VoteButton } from "../ui/VoteButton";
import { usePeek } from "./peek-context";

const Editor = lazy(() => import("@/components/prosekit/editor"));

/** The description is clamped to this height (with a fade) in Peek; the full post shows the rest. */
const DESCRIPTION_CLAMP_PX = 240;

/** Description typography for the narrow panel (15/26 instead of the post page's 16/28). */
const PEEK_DESCRIPTION_PROSE = cn(
	DESCRIPTION_PROSE,
	"text-[15px] leading-[26px] prose-li:leading-[26px] prose-p:leading-[26px]"
);

/** Header, left side: the post key as a pill (`SAY-55`). */
function PeekKeyPill() {
	const { organization } = usePublicOrganizationLayout();
	const { shortId } = usePeek();
	if (shortId === null) return null;
	return <Pill variant="gh">{formatTaskKey(organization.shortId, shortId)}</Pill>;
}

/**
 * Header, right side: Copy link (canonical `/{shortId}` URL), Open full page, and the close action. The native close
 * button is switched off for this header (`showClose: false`) because it would close the whole panel; this one only
 * leaves the post (clears `?task`, back to the overview), the same X position the overview's native button has.
 */
function PeekHeaderActions() {
	const { organization } = usePublicOrganizationLayout();
	const { shortId, closePost } = usePeek();
	const postPublicUrl = usePostPublicUrl();

	const copyLink = async () => {
		if (shortId === null) return;
		const url = postPublicUrl(organization.slug, shortId);
		try {
			await navigator.clipboard.writeText(url);
			headlessToast.success({ title: "Link copied" });
		} catch {
			headlessToast.error({ title: "Could not copy the link" });
		}
	};

	return (
		<>
			{shortId !== null && (
				<>
					<PortalButton
						variant="ghost"
						size="sm"
						onClick={copyLink}
						aria-label="Copy link"
						title="Copy link"
						className="px-2"
					>
						<IconLink aria-hidden />
					</PortalButton>
					<Link
						to="/orgs/$orgSlug/$shortId"
						params={{ orgSlug: organization.slug, shortId: String(shortId) }}
						className={portalButtonVariants({ size: "sm" })}
					>
						Open full page
						<IconArrowUpRight aria-hidden />
					</Link>
				</>
			)}
			<Button variant="ghost" size="icon" onClick={closePost} aria-label="Close post" title="Close post">
				<IconX />
			</Button>
		</>
	);
}

/**
 * Header for the post view in the `PanelHeaderConfig` object form, so `Page` renders its native h-11 bar around it.
 * A module-level constant on purpose: both parts read the open post from `usePeek()`, so it is handed to the store
 * once per view change and stays in sync by itself.
 */
export const PEEK_HEADER: PanelHeaderConfig = {
	icon: <PeekKeyPill />,
	actions: <PeekHeaderActions />,
	showClose: false,
};

/** Read-only description, clamped with a fade when it is longer than `DESCRIPTION_CLAMP_PX`. */
function PeekDescription({ post, tasks }: { post: PeekPost; tasks: schema.TaskWithLabels[] }) {
	const innerRef = useRef<HTMLDivElement>(null);
	const [overflowing, setOverflowing] = useState(false);

	// The editor loads lazily and grows after mount, so watch the natural height rather than measuring once.
	useEffect(() => {
		const element = innerRef.current;
		if (!element) return;
		const observer = new ResizeObserver(() => setOverflowing(element.offsetHeight > DESCRIPTION_CLAMP_PX));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			className={cn(
				"overflow-hidden",
				overflowing && "[mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
			)}
			style={{ maxHeight: DESCRIPTION_CLAMP_PX }}
		>
			<div ref={innerRef} className={PEEK_DESCRIPTION_PROSE}>
				<Suspense fallback={<div className="h-20 animate-pulse rounded bg-portal-raised" />}>
					<Editor readonly defaultContent={post.description} tasks={tasks} hideBlockHandle />
				</Suspense>
			</div>
		</div>
	);
}

function PeekPostView({ post }: { post: PeekPost }) {
	const { organization, categories } = usePublicOrganizationLayout();
	const { tasks } = usePeek();
	const { releasesById } = useBoardReleases(organization.slug);
	const vote = useBoardVote(post);
	const {
		allComments,
		totalCount,
		isLoading: commentsLoading,
	} = usePostComments({ taskId: post.id, organizationId: organization.id });

	const latestUpdate = useMemo(() => getLatestUpdate(allComments, organization), [allComments, organization]);

	const category = post.category ? categories.find((c) => c.id === post.category) : undefined;
	const release = post.releaseId ? (releasesById.get(post.releaseId) ?? null) : null;
	const releaseTag = release && post.status !== "done" ? release : null;
	// The status banner takes dates as Date | string; the release summary may carry any date-ish value.
	const bannerRelease = useMemo(
		() =>
			release
				? {
						name: release.name,
						slug: release.slug,
						status: release.status,
						releasedAt: toDate(release.releasedAt),
						targetDate: toDate(release.targetDate),
						createdAt: toDate(release.createdAt),
					}
				: null,
		[release]
	);
	const creator = post.createdBy ?? null;
	const creatorName = creator ? getDisplayName(creator) : null;
	const commentCount = commentsLoading ? (post.comments?.length ?? 0) : totalCount;

	return (
		<div className="px-5 pt-4 pb-8">
			<div className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
				<StatusChip status={post.status} />
				{category && <CategoryTag category={category} />}
				{releaseTag && <ReleaseTag name={releaseTag.name} />}
			</div>

			<h2 className="font-bold text-[26px] text-portal-fg leading-8 tracking-[-0.026em]">{post.title}</h2>

			<div className="mt-3.5 mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13.5px] text-portal-fg-2">
				{creator && creatorName && (
					<>
						<PortalAvatar
							name={creatorName}
							image={creator.image}
							size={24}
							ring={isTeamMember(creator.id, organization)}
						/>
						<b className="font-semibold text-portal-fg">{creatorName}</b>
						<Pill variant="author" />
					</>
				)}
				{post.createdAt && <span>{formatShortDate(post.createdAt)}</span>}
			</div>

			<div className="mb-6 flex gap-2.5">
				<VoteButton
					count={vote.voteCount}
					voted={vote.voted}
					disabled={vote.disabled}
					onToggle={vote.toggle}
					showCount
					className="flex-1"
				/>
				{post.githubIssue && (
					<a
						href={post.githubIssue.issueUrl}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={`Linked GitHub issue #${post.githubIssue.issueNumber}`}
						className={cn(portalButtonVariants({ size: "lg" }), "shrink-0")}
					>
						<IconBrandGithub aria-hidden className="size-[18px]!" />#{post.githubIssue.issueNumber}
					</a>
				)}
			</div>

			<div className="flex flex-col gap-4">
				<PostStepperCard status={post.status} compact />
				<PostStatusBanner
					task={post}
					release={bannerRelease}
					orgSlug={organization.slug}
					lastUpdateBy={latestUpdate?.createdBy ? getDisplayName(latestUpdate.createdBy) : null}
				/>
				{latestUpdate && (
					<LatestUpdateCard
						comment={latestUpdate}
						isAuthor={!!creator && latestUpdate.createdBy?.id === creator.id}
						tasks={tasks}
					/>
				)}
			</div>

			<hr className="mt-6 mb-5 border-portal-line" />

			{post.description && <PeekDescription post={post} tasks={tasks} />}

			{post.shortId !== null && (
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={{ orgSlug: organization.slug, shortId: String(post.shortId) }}
					className="mt-3 inline-flex items-center gap-1.5 font-medium text-portal-accent-ink text-sm hover:underline focus-visible:underline"
				>
					{fullPostLinkLabel(commentCount)}
					<IconArrowRight aria-hidden className="size-3.5" />
				</Link>
			)}

			<div className="mt-7 border-portal-line border-t pt-5">
				<PostCommentComposer
					taskId={post.id}
					organizationId={organization.id}
					taskStatus={post.status}
					tasks={tasks}
				/>
			</div>
		</div>
	);
}

function PeekSkeleton() {
	return (
		<div aria-busy="true" className="animate-pulse px-5 pt-4 pb-8">
			<div className="mb-4 flex gap-3">
				<div className="h-6 w-20 rounded-full bg-portal-raised" />
				<div className="h-6 w-28 rounded-full bg-portal-raised" />
			</div>
			<div className="mb-3 h-8 w-4/5 rounded bg-portal-raised" />
			<div className="mb-6 h-5 w-1/3 rounded bg-portal-raised" />
			<div className="mb-6 h-11 w-full rounded-portal-md bg-portal-raised" />
			<div className="mb-4 h-24 w-full rounded-portal-lg bg-portal-raised" />
			<div className="h-32 w-full rounded bg-portal-raised" />
		</div>
	);
}

/**
 * Body of the post view in the board panel. Takes no props: it reads the open post from `usePeek()`, which resolves it
 * from the board's live list (or a fetch for a deep link), so it re-renders on votes, status changes and comments
 * without the panel content ever being re-set. `Page` keys the panel content on the trigger id, so switching rows (or
 * going between a post and the overview) remounts it.
 */
export function PeekPanelContent() {
	const { post, status, shortId } = usePeek();
	const { organization } = usePublicOrganizationLayout();

	if (post) return <PeekPostView post={post} />;

	if (status === "error" && shortId !== null) {
		return (
			<div className="px-5 pt-6 pb-8 text-[13.5px] text-portal-fg-2">
				<p className="mb-3 font-semibold text-[15px] text-portal-fg">This post could not be loaded</p>
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={{ orgSlug: organization.slug, shortId: String(shortId) }}
					className="font-medium text-portal-accent-ink hover:underline focus-visible:underline"
				>
					Open the full page
				</Link>
			</div>
		);
	}

	return <PeekSkeleton />;
}

/** Stable element handed to the panel store once (it holds no props, see `PeekPanelContent`). */
export const PEEK_CONTENT = <PeekPanelContent />;
