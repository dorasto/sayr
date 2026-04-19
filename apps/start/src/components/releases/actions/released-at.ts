import type { ReleaseFieldUpdatePayload } from "./types";

/**
 * Builds the update payload for changing a release's releasedAt date.
 */
export function getReleaseReleasedAtUpdatePayload(date: Date | null): ReleaseFieldUpdatePayload {
	return {
		field: "releasedAt",
		updateData: { releasedAt: date },
		toastMessages: {
			loading: { title: date ? "Setting release date..." : "Clearing release date..." },
			success: {
				title: date ? "Release date set" : "Release date cleared",
				description: date ? `Set to ${date.toLocaleDateString()}` : undefined,
			},
			error: { title: "Failed to update release date" },
		},
	};
}
