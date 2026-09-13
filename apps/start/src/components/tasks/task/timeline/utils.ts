import type { schema } from "@repo/database";
import type { ConsolidatedTimelineItem, TimelineRunGroup } from "./types";

/**
 * Consolidates timeline items that occur within a time window from the same actor into a
 * single merged, human-readable entry — e.g. "Tom added Bug, Urgent and removed Draft" for
 * a burst of label churn, or "Tom updated the description" for a run of rapid edits. Items
 * with content (comments, and description snapshots that carry rich-text content) are
 * never consolidated, to preserve individual comment history.
 *
 * @param items - Array of timeline items to consolidate
 * @param timeWindowMinutes - Time window in minutes for consolidation (default: 2)
 * @returns Array of individual items and consolidated groups
 */
export function consolidateTimelineItems(
	items: schema.taskTimelineWithActor[],
	timeWindowMinutes = 2
): (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] {
	if (!items.length) return [];

	const result: (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] = [];
	let currentGroup: schema.taskTimelineWithActor[] = [];
	let currentActor: string | null = null;
	let groupStartTime: Date | null = null;

	const flushCurrentGroup = () => {
		if (currentGroup.length === 0) return;

		// Comments are never consolidated — everything else (including `updated` events, which
		// also carry a `content` snapshot of the new description) is eligible for merging below.
		const comments = currentGroup.filter((item) => item.eventType === "comment");
		const nonCommentItems = currentGroup.filter((item) => item.eventType !== "comment");

		// Add comments individually
		comments.forEach((item) => result.push(item));

		// Consolidate non-comment items if there are multiple similar events
		if (nonCommentItems.length <= 1) {
			nonCommentItems.forEach((item) => result.push(item));
		} else {
			const consolidatableTypes = [
				"label_added",
				"label_removed",
				"assignee_added",
				"assignee_removed",
				"updated",
				"parent_added",
				"parent_removed",
				"subtask_added",
				"subtask_removed",
				"relation_added",
				"relation_removed",
			];
			const consolidatableItems = nonCommentItems.filter((item) => consolidatableTypes.includes(item.eventType));
			const nonConsolidatableItems = nonCommentItems.filter((item) => !consolidatableTypes.includes(item.eventType));

			// Add non-consolidatable items individually
			nonConsolidatableItems.forEach((item) => result.push(item));

			// Group consolidatable items
			if (consolidatableItems.length > 1) {
				const eventTypes = [...new Set(consolidatableItems.map((item) => item.eventType))];
				const firstItem = consolidatableItems[0];
				if (firstItem) {
					const consolidated: ConsolidatedTimelineItem = {
						id: `consolidated-${firstItem.id}`,
						actor: firstItem.actor,
						createdAt: firstItem.createdAt as Date,
						items: consolidatableItems,
						eventTypes,
					};
					result.push(consolidated);
				}
			} else {
				consolidatableItems.forEach((item) => result.push(item));
			}
		}

		currentGroup = [];
	};

	for (const item of items) {
		const itemTime = new Date(item.createdAt as Date);
		const itemActorId = item.actorId;

		// Check if this item should start a new group
		const shouldStartNewGroup =
			currentActor !== itemActorId ||
			!groupStartTime ||
			itemTime.getTime() - groupStartTime.getTime() > timeWindowMinutes * 60 * 1000;

		if (shouldStartNewGroup) {
			flushCurrentGroup();
			currentActor = itemActorId;
			groupStartTime = itemTime;
		}

		currentGroup.push(item);
	}

	// Flush the last group
	flushCurrentGroup();

	return result;
}

/**
 * Truncates long runs of consecutive non-comment timeline entries into a single collapsed
 * group. This is a separate, generic, type-agnostic pass layered on top of the semantic
 * consolidation above: `consolidateTimelineItems` merges same-actor bursts of a handful of
 * mergeable event types into a meaningful sentence, but plenty of activity has no sensible
 * merged summary (status/priority churn, category/release changes, GitHub activity, etc.),
 * spans multiple actors, or is simply too spread out in time to consolidate — any of that
 * can still flood the timeline with a long stretch of activity rows. This pass doesn't care
 * what kind of entry it's looking at (raw item or already-consolidated group), or how much
 * time separates them — a comment is the only thing that ever breaks a run, so there is at
 * most one collapsible run between any two comments (or before the first / after the last).
 *
 * @param items - Chronologically sorted array of raw items and/or consolidated groups
 * @param options.minRunLength - Runs longer than this are collapsed (default: 4 — the
 * renderer always keeps the oldest 2 and newest 2 run members visible for context, so
 * anything at or below that count would never have anything left to actually hide)
 * @returns Array of individual items, consolidated groups, and collapsed run groups
 */
export function groupTimelineRuns(
	items: (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[],
	options?: { minRunLength?: number }
): (schema.taskTimelineWithActor | ConsolidatedTimelineItem | TimelineRunGroup)[] {
	const minRunLength = options?.minRunLength ?? 4;

	const result: (schema.taskTimelineWithActor | ConsolidatedTimelineItem | TimelineRunGroup)[] = [];
	let currentRun: (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] = [];

	const isCommentLike = (entry: schema.taskTimelineWithActor | ConsolidatedTimelineItem): boolean =>
		!("items" in entry) && entry.eventType === "comment";

	const flushCurrentRun = () => {
		if (currentRun.length === 0) return;

		if (currentRun.length > minRunLength) {
			const firstItemOfRun = currentRun[0];
			if (firstItemOfRun) {
				const runGroup: TimelineRunGroup = {
					id: `run-${firstItemOfRun.id}`,
					createdAt: firstItemOfRun.createdAt as Date,
					runItems: currentRun,
				};
				result.push(runGroup);
			}
		} else {
			currentRun.forEach((entry) => result.push(entry));
		}

		currentRun = [];
	};

	for (const entry of items) {
		if (isCommentLike(entry)) {
			flushCurrentRun();
			result.push(entry);
			continue;
		}

		currentRun.push(entry);
	}

	flushCurrentRun();

	return result;
}
