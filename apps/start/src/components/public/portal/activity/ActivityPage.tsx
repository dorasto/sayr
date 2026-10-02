import { cn } from "@repo/ui/lib/utils";
import { authClient } from "@repo/auth/client";
import { Skeleton } from "@repo/ui/components/skeleton";
import { IconLoader2 } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { Page } from "@/components/generic/page";
import { usePublicPostAbility } from "@/components/public/public-task-creator";
import { PublicTaskItem } from "@/components/public/task-item";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { type ActivityTab, useActivity } from "@/hooks/portal/useActivity";
import { formatTabCount } from "@/lib/portal/activity";
import { ListContainer } from "../ui/ListContainer";
import { PORTAL_BODY } from "../ui/column";
import { PortalAvatar } from "../ui/PortalAvatar";
import { PortalButton } from "../ui/PortalButton";
import { PortalTabs } from "../ui/PortalTabs";
import { RowSkeletonList } from "../ui/RowSkeleton";
import { ShippedBecauseYouAskedCard, VotesStandCard } from "./ActivityRail";
import {
	ActivityErrorState,
	ActivityLoggedOutState,
	ActivityPostedEmptyState,
	ActivityVotedEmptyState,
} from "./ActivityStates";

interface ActivityUser {
	id: string;
	name: string;
	image?: string | null;
}

function ActivityHeader({ user, orgName }: { user: ActivityUser | null; orgName: string }) {
	const handleLogOut = async () => {
		await authClient.signOut();
		window.location.reload();
	};

	return (
		<div className="mb-8 flex items-center gap-4 md:mb-9 md:gap-5">
			{user ? (
				<PortalAvatar name={user.name} image={user.image} size={64} />
			) : (
				<Skeleton aria-hidden className="size-16 shrink-0 rounded-full bg-portal-raised" />
			)}
			<div className="min-w-0 flex-1">
				<h1 className="truncate font-bold text-[24px] leading-[30px] tracking-[-0.028em] md:text-[28px] md:leading-[34px]">
					{user?.name ?? "Your activity"}
				</h1>
				<p className="mt-0.5 text-[15px] text-portal-fg-2 leading-6">
					Everything you have voted on and posted on {orgName}.
				</p>
			</div>
			{user && <PortalButton onClick={handleLogOut}>Log out</PortalButton>}
		</div>
	);
}

function ActivityBody({ user }: { user: ActivityUser }) {
	const { organization, categories } = usePublicOrganizationLayout();
	const { canPost } = usePublicPostAbility();
	const [tab, setTab] = useState<ActivityTab>("voted");
	const activity = useActivity(user.id, tab);
	const orgSlug = organization.slug;

	const posts = tab === "voted" ? activity.votedPosts : activity.postedPosts;

	let content: ReactNode;
	if (activity.isError) {
		content = <ActivityErrorState onRetry={activity.retry} />;
	} else if (activity.isLoading) {
		content = (
			<>
				<span className="sr-only">Loading your activity</span>
				<RowSkeletonList count={4} />
			</>
		);
	} else if (posts.length === 0 && !activity.activeTruncated) {
		content =
			tab === "voted" ? (
				<ActivityVotedEmptyState orgSlug={orgSlug} />
			) : (
				<ActivityPostedEmptyState orgSlug={orgSlug} canPost={canPost} />
			);
	} else {
		content = (
			<>
				{posts.length > 0 && (
					<ListContainer>
						{posts.map((task) => (
							<PublicTaskItem
								key={task.id}
								task={task}
								categories={categories}
								release={task.releaseId ? (activity.releasesById.get(task.releaseId) ?? null) : null}
								compact
							/>
						))}
					</ListContainer>
				)}
				{activity.activeTruncated && (
					<div className="mt-6 flex flex-col items-center gap-2">
						<p className="text-[13px] text-portal-fg-3">Showing posts loaded so far. There may be more.</p>
						{activity.isLoadingMore ? (
							<span className="inline-flex items-center gap-2 text-[13px] text-portal-fg-3">
								<IconLoader2 aria-hidden className="size-4 animate-spin" />
								Loading
							</span>
						) : (
							activity.canLoadMore && (
								<PortalButton onClick={activity.loadMore} className="max-md:h-11">
									Load more posts
								</PortalButton>
							)
						)}
					</div>
				)}
			</>
		);
	}

	const ready = !activity.isError && !activity.isLoading;

	return (
		<div className="flex flex-col gap-10 lg:flex-row lg:items-start">
			<section className="min-w-0 flex-1">
				<PortalTabs
					className="mb-4"
					value={tab}
					onValueChange={(value) => setTab(value === "posted" ? "posted" : "voted")}
					items={[
						{
							value: "voted",
							label: "Voted",
							count: ready ? formatTabCount(activity.votedPosts.length, activity.votedTruncated) : undefined,
						},
						{
							value: "posted",
							label: "Posted",
							count: ready ? formatTabCount(activity.postedPosts.length, activity.postedTruncated) : undefined,
						},
					]}
				/>
				{content}
			</section>

			{ready && (activity.shipped.length > 0 || activity.votedPosts.length > 0) && (
				<aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[300px] xl:w-80">
					<ShippedBecauseYouAskedCard orgSlug={orgSlug} items={activity.shipped} />
					<VotesStandCard rows={activity.statusRows} segments={activity.barSegments} />
				</aside>
			)}
		</div>
	);
}

/** The viewer's own activity on the org's portal: posts they voted on and posts they wrote. Needs a login. */
export function ActivityPage() {
	const { organization } = usePublicOrganizationLayout();
	const { data: session, isPending } = authClient.useSession();
	const user: ActivityUser | null = session?.user
		? { id: session.user.id, name: session.user.name, image: session.user.image }
		: null;

	return (
		<Page>
			<div className={cn(PORTAL_BODY, "pt-8 pb-16 md:pt-12")}>
				{!isPending && !user ? (
					<ActivityLoggedOutState />
				) : (
					<>
						<ActivityHeader user={user} orgName={organization.name} />
						{user ? <ActivityBody user={user} /> : <RowSkeletonList count={4} className="max-w-[760px]" />}
					</>
				)}
			</div>
		</Page>
	);
}
