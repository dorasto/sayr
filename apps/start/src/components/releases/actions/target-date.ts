import type { ReleaseFieldUpdatePayload } from "./types";

/**
 * Builds the update payload for changing a release's target date.
 */
export function getReleaseTargetDateUpdatePayload(date: Date | null): ReleaseFieldUpdatePayload {
	return {
		field: "targetDate",
		updateData: { targetDate: date },
		toastMessages: {
			loading: { title: date ? "Setting target date..." : "Clearing target date..." },
			success: {
				title: date ? "Target date set" : "Target date cleared",
				description: date ? `Set to ${date.toLocaleDateString()}` : undefined,
			},
			error: { title: "Failed to update target date" },
		},
	};
}
