import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconBulb, IconFilterOff, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { BoardTab } from "@/lib/portal/board-filters";
import { usePublicPostAbility } from "../../public-task-creator";
import { newPostLink } from "./new-post-path";

interface BoardEmptyStateProps {
	tab: BoardTab;
	/** The org has no public posts at all. */
	boardIsEmpty: boolean;
	hasActiveFilters: boolean;
	onShowAll: () => void;
	onClearFilters: () => void;
}

const TAB_NAMES: Record<BoardTab, string> = { active: "Active", done: "Done", all: "All" };

/** What the Feedback board shows when no post is visible: first run, nothing active, or nothing matching the filters. */
export function BoardEmptyState({
	tab,
	boardIsEmpty,
	hasActiveFilters,
	onShowAll,
	onClearFilters,
}: BoardEmptyStateProps) {
	const { organization } = usePublicOrganizationLayout();
	const { canPost } = usePublicPostAbility();

	const noActive = !boardIsEmpty && tab === "active" && !hasActiveFilters;
	const title = boardIsEmpty
		? "No posts yet"
		: noActive
			? "No active posts"
			: hasActiveFilters
				? "No posts match these filters"
				: `Nothing under ${TAB_NAMES[tab]} yet`;
	const description = boardIsEmpty
		? "Be the first to tell the team what you need."
		: noActive
			? "Nothing is open right now. Look under Done or All to see earlier posts."
			: hasActiveFilters
				? "Try fewer filters, or clear them to see every post."
				: "Posts show up here as they change status.";

	return (
		<div className="mx-auto flex max-w-[340px] flex-col items-center py-14 text-center">
			<span
				aria-hidden
				className={cn(
					"mb-3.5 inline-flex size-12 items-center justify-center rounded-xl",
					boardIsEmpty ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
				)}
			>
				{boardIsEmpty ? <IconBulb className="size-6" /> : <IconFilterOff className="size-6" />}
			</span>
			<div className="font-semibold text-base">{title}</div>
			<p className="mt-1.5 text-muted-foreground text-sm">{description}</p>
			<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
				{boardIsEmpty && canPost && (
					<Button render={<Link {...newPostLink(organization.slug)} />} nativeButton={false}>
						<IconPlus aria-hidden />
						Share an idea
					</Button>
				)}
				{noActive && (
					<Button variant="outline" size="sm" onClick={onShowAll}>
						Show all posts
					</Button>
				)}
				{!boardIsEmpty && hasActiveFilters && (
					<Button variant="outline" size="sm" onClick={onClearFilters}>
						Clear filters
					</Button>
				)}
			</div>
		</div>
	);
}
