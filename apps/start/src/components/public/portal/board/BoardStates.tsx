import { IconAlertTriangle, IconBulb, IconFilterOff, IconPlus, IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { newPostLink } from "./new-post-path";
import { EmptyState } from "../ui/EmptyState";
import { PortalButton, portalButtonVariants } from "../ui/PortalButton";

interface BoardEmptyProps {
	orgSlug: string;
	/** Whether the viewer may post at all; without it the call to action is left out. */
	canPost: boolean;
}

/** The org has no public posts yet. */
export function BoardEmptyState({ orgSlug, canPost }: BoardEmptyProps) {
	return (
		<EmptyState
			className="py-14"
			tone="accent"
			icon={<IconBulb className="size-6" />}
			title="No posts yet"
			description="Be the first to tell the team what you need."
			actions={
				canPost && (
					<Link {...newPostLink(orgSlug)} className={portalButtonVariants({ variant: "primary" })}>
						<IconPlus aria-hidden />
						Share an idea
					</Link>
				)
			}
		/>
	);
}

/** The Active tab has no open posts (the org may still have done or closed ones). */
export function BoardNoActiveState({ onShowAll }: { onShowAll: () => void }) {
	return (
		<EmptyState
			className="py-14"
			icon={<IconFilterOff className="size-6" />}
			title="No active posts"
			description="Nothing is open right now. Look under Done or All to see earlier posts."
			actions={<PortalButton onClick={onShowAll}>Show all posts</PortalButton>}
		/>
	);
}

/** Filters (or an empty tab) leave nothing to show. */
export function BoardNoResultsState({ onClear, tabLabel }: { onClear?: () => void; tabLabel: string }) {
	return (
		<EmptyState
			className="py-14"
			icon={<IconFilterOff className="size-6" />}
			title={onClear ? "No posts match these filters" : `Nothing under ${tabLabel} yet`}
			description={
				onClear
					? "Try fewer filters, or clear them to see every post."
					: "Posts show up here as they change status."
			}
			actions={onClear && <PortalButton onClick={onClear}>Clear filters</PortalButton>}
		/>
	);
}

/** The list could not be loaded. */
export function BoardErrorState({ onRetry }: { onRetry: () => void }) {
	return (
		<div
			role="alert"
			className="flex items-center gap-3.5 rounded-portal-lg border border-[color-mix(in_oklch,var(--portal-bad)_45%,transparent)] bg-portal-surface px-[22px] py-5 shadow-portal-hl"
		>
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-portal-md bg-portal-bad-soft text-portal-bad"
			>
				<IconAlertTriangle className="size-5" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="font-semibold text-[15px]">We could not load the board</div>
				<div className="text-[13.5px] text-portal-fg-2">Check your connection and try again.</div>
			</div>
			<PortalButton onClick={onRetry}>
				<IconRefresh aria-hidden />
				Retry
			</PortalButton>
		</div>
	);
}
