import type { schema } from "@repo/database";
import type { ConsolidatedTimelineItem, TimelineRunGroup } from "./types";

/**
 * Consolidates timeline items that occur within a time window from the same actor into a
 * single merged, human-readable entry — e.g. "Tom added Bug, Urgent and removed Draft" for
 * a burst of label churn, or "Tom linked SAY-12 and unlinked SAY-20" for task-link churn.
 * Comments are never consolidated, to preserve individual comment history. `updated` events
 * (title/description/visibility edits) are handled upstream by `mergeUpdateSessions` instead
 * of here — an entry already shaped like `ConsolidatedTimelineItem` is passed through
 * untouched (and treated as a hard boundary, like a comment) rather than re-grouped.
 *
 * @param items - Array of raw items and/or already-consolidated groups (chronologically sorted)
 * @param timeWindowMinutes - Time window in minutes for consolidation (default: 2)
 * @returns Array of individual items and consolidated groups
 */
export function consolidateTimelineItems(
	items: (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[],
	timeWindowMinutes = 2
): (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] {
	if (!items.length) return [];

	const result: (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] = [];
	let currentGroup: schema.taskTimelineWithActor[] = [];
	let currentActor: string | null = null;
	let groupStartTime: Date | null = null;

	const flushCurrentGroup = () => {
		if (currentGroup.length === 0) return;

		// Comments are never consolidated — everything else (aside from `updated` events, which
		// are pre-merged upstream by `mergeUpdateSessions`) is eligible for merging below.
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
		if ("items" in item) {
			// Already consolidated upstream (an update-edit session) — pass through untouched,
			// and treat it as a hard boundary the same way an actor change resets grouping.
			flushCurrentGroup();
			result.push(item);
			currentActor = null;
			groupStartTime = null;
			continue;
		}

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
 * Merges consecutive `updated` events (title/description/visibility edits) from the same
 * actor into a single entry whose timestamp keeps rolling forward to the latest edit, as
 * long as edits keep landing within `sessionGapMinutes` of the previous one and nothing else
 * interrupts the streak. Addresses the SSE-driven noise of a user pausing while editing the
 * description: every autosave fires its own `updated` event, but the timeline should read as
 * one ongoing edit — "updated the description (×12) · just now" — rather than splitting into
 * a fresh burst every time a pause happens to straddle the general 2-minute consolidation
 * window used for labels/assignees/links.
 *
 * Unlike `consolidateTimelineItems`, the window here is rolling (measured from the previous
 * session member, not the session's start) and the session breaks on ANY intervening event —
 * not just a gap or an actor change — so an unrelated label change or someone else's comment
 * landing mid-edit starts a fresh session for the next update.
 *
 * @param items - Chronologically sorted array of raw timeline items
 * @param sessionGapMinutes - Max gap between consecutive updates in a session (default: 20)
 * @returns Array of individual items and merged update-session groups
 */
export function mergeUpdateSessions(
	items: schema.taskTimelineWithActor[],
	sessionGapMinutes = 20
): (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] {
	const result: (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] = [];
	let session: schema.taskTimelineWithActor[] = [];

	const flushSession = () => {
		if (session.length === 0) return;

		if (session.length === 1) {
			session.forEach((item) => result.push(item));
		} else {
			const firstItem = session[0];
			const lastItem = session[session.length - 1];
			if (firstItem && lastItem) {
				const consolidated: ConsolidatedTimelineItem = {
					id: `update-session-${firstItem.id}`,
					actor: firstItem.actor,
					createdAt: lastItem.createdAt as Date,
					items: session,
					eventTypes: ["updated"],
				};
				result.push(consolidated);
			}
		}

		session = [];
	};

	for (const item of items) {
		if (item.eventType !== "updated") {
			flushSession();
			result.push(item);
			continue;
		}

		const lastSessionItem = session[session.length - 1];
		if (lastSessionItem) {
			const gapMs =
				new Date(item.createdAt as Date).getTime() - new Date(lastSessionItem.createdAt as Date).getTime();
			if (item.actorId !== lastSessionItem.actorId || gapMs > sessionGapMinutes * 60 * 1000) {
				flushSession();
			}
		}

		session.push(item);
	}

	flushSession();

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
