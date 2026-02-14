export type SortOption = "newest" | "oldest" | "priority" | "status";

export const priorityOrder: Record<string, number> = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
	none: 4,
};

export const statusOrder: Record<string, number> = {
	"in-progress": 0,
	todo: 1,
	backlog: 2,
	done: 3,
	canceled: 4,
};
