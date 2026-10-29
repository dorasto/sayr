import { type ComponentType, useEffect, useId, useMemo, useRef, useState } from "react";
import { type BoardGroupingOptions, groupTasks } from "../config/groupings";
import { useBoardEntity, useBoardGroupings, useBoardItemsData } from "../core/board-data";
import type { BoardItem } from "../core/board-item";
import type { BoardEntityCardProps } from "../core/entity";
import { useBoardViewState } from "../filter/use-board-view-state";
import { BoardFooter } from "./board-load-more";
import { deriveCardLayout, flattenCardGroups, getDefaultCollapsedGroupIds, toggleCollapsedId } from "./card-sections";
import { GroupHeaderContent } from "./group-header";

/** Renders one item as a card — the entity's `Card` (tasks: `renderers.card`, else BoardCard). */
export type CardRenderer = ComponentType<BoardEntityCardProps<BoardItem>>;

export interface BoardCardViewProps {
	/** Already filtered/sorted by `Board`. */
	items: readonly BoardItem[];
	/** Overrides the card element for this view only. Absent = the board entity's `Card`. */
	renderCard?: CardRenderer;
}

interface CardGridProps {
	tasks: readonly BoardItem[];
	Card: CardRenderer;
}

/**
 * A responsive auto-fill grid of cards. The min column width is a CSS variable so a host can retune it
 * (`--board-card-min`). Each cell is a single-child grid so the card stretches to the row's height.
 */
function CardGrid({ tasks, Card }: CardGridProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the role is restated on purpose (see below)
		<ul
			// Tailwind's preflight sets `list-style: none`, which makes Safari/VoiceOver drop the list semantics, so
			// the role is restated on purpose.
			// biome-ignore lint/a11y/noRedundantRoles: see above
			role="list"
			className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,var(--board-card-min,280px)),1fr))] gap-3"
		>
			{tasks.map((task) => (
				<li key={task.id} className="grid min-w-0">
					<Card item={task} variant="grid" />
				</li>
			))}
		</ul>
	);
}

/**
 * The card view: tasks as a grid of cards, optionally grouped. No sub-grouping (ignored, never written to
 * state), no drag-to-regroup, and subtasks are flat — every task is its own card. A grouping other than
 * "none" renders one collapsible section per group, with the same header and collapse rules as the list
 * view (reset when the grouping changes; empty groups start collapsed).
 */
export function BoardCardView({ items, renderCard }: BoardCardViewProps) {
	const data = useBoardItemsData();
	const { Card: EntityCard } = useBoardEntity();
	const Card = renderCard ?? EntityCard;
	const groupings = useBoardGroupings();
	const { grouping, showCompletedTasks } = useBoardViewState();
	const idPrefix = useId();

	const options = useMemo<BoardGroupingOptions<BoardItem>>(
		() => ({
			categories: data.categories,
			releases: data.releases,
			showCompletedTasks,
			groupings,
			data,
		}),
		[data, groupings, showCompletedTasks]
	);
	const groups = useMemo(() => groupTasks(items, grouping, options), [items, grouping, options]);
	const layout = useMemo(() => deriveCardLayout(grouping, groups), [grouping, groups]);

	// Latest groups for the grouping-change effect below, without making that effect re-fire on every
	// task/filter change — only a grouping change resets what the user collapsed (same as the list view).
	const groupsRef = useRef(groups);
	groupsRef.current = groups;
	const [collapsed, setCollapsed] = useState<Set<string>>(() => getDefaultCollapsedGroupIds(groups));
	const lastGroupingRef = useRef(grouping);
	// Only a grouping change resets the collapse state; groupsRef always holds the latest groups.
	useEffect(() => {
		if (lastGroupingRef.current === grouping) return;
		lastGroupingRef.current = grouping;
		setCollapsed(getDefaultCollapsedGroupIds(groupsRef.current));
	}, [grouping]);

	if (layout.kind === "flat") {
		const flat = flattenCardGroups(layout.groups);
		return (
			<div>
				{flat.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">No tasks</p>
				) : (
					<CardGrid tasks={flat} Card={Card} />
				)}
				<BoardFooter />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{layout.groups.map((group) => {
				const headingId = `${idPrefix}-${group.id}`;
				const expanded = !collapsed.has(group.id);
				return (
					<section key={group.id} aria-labelledby={headingId}>
						<div className="sticky top-0 z-10 w-full overflow-hidden rounded-xl bg-background">
							<h3 id={headingId} className="m-0 font-normal">
								<GroupHeaderContent
									label={group.label}
									icon={group.icon}
									count={group.tasks.length}
									toneClassName={group.toneClassName}
									color={group.color}
									expanded={expanded}
									onToggleExpanded={() => setCollapsed((prev) => toggleCollapsedId(prev, group.id))}
								/>
							</h3>
						</div>
						{expanded && (
							<div className="pt-2">
								<CardGrid tasks={group.tasks} Card={Card} />
							</div>
						)}
					</section>
				);
			})}
			<BoardFooter />
		</div>
	);
}
