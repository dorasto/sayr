import type { schema } from "@repo/database";
import type { ConsolidatedTimelineItem } from "./types";

/**
 * Consolidates timeline items that occur within a time window from the same actor.
 * Items with content are never consolidated to preserve individual comments.
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

		// Never consolidate items with content
		const itemsWithContent = currentGroup.filter((item) => item.content);
		const itemsWithoutContent = currentGroup.filter((item) => !item.content);

		// Add items with content individually
		itemsWithContent.forEach((item) => result.push(item));

		// Consolidate items without content if there are multiple similar events
		if (itemsWithoutContent.length <= 1) {
			itemsWithoutContent.forEach((item) => result.push(item));
		} else {
			const consolidatableTypes = ["label_added", "label_removed", "assignee_added", "assignee_removed"];
			const consolidatableItems = itemsWithoutContent.filter((item) => consolidatableTypes.includes(item.eventType));
			const nonConsolidatableItems = itemsWithoutContent.filter(
				(item) => !consolidatableTypes.includes(item.eventType)
			);

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
