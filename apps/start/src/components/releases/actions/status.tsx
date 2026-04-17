import { releaseStatusConfig, RELEASE_STATUS_ORDER, type ReleaseStatusKey } from "../config";
import type { ReleaseFieldOption, ReleaseFieldUpdatePayload } from "./types";

const STATUS_ICON_CLASS = "h-3.5 w-3.5";

/**
 * Returns all available status options for the release status picker.
 */
export function getReleaseStatusOptions(): ReleaseFieldOption[] {
	return RELEASE_STATUS_ORDER.map((key) => {
		const cfg = releaseStatusConfig[key];
		return {
			id: key,
			label: cfg.label,
			icon: cfg.icon(`${STATUS_ICON_CLASS} ${cfg.className}`),
			value: key,
			keywords: `status ${cfg.label}`,
		};
	});
}

/**
 * Returns the display icon+label for a given release status key.
 */
export function getReleaseStatusDisplay(status: ReleaseStatusKey) {
	const cfg = releaseStatusConfig[status];
	return {
		label: cfg.label,
		icon: cfg.icon(`${STATUS_ICON_CLASS} ${cfg.className}`),
		className: cfg.className,
		badgeClassName: cfg.badgeClassName,
	};
}

/**
 * Builds the update payload for changing a release's status.
 * Also auto-sets releasedAt when transitioning to "released".
 */
export function getReleaseStatusUpdatePayload(
	currentReleasedAt: Date | string | null,
	newStatus: ReleaseStatusKey,
): ReleaseFieldUpdatePayload {
	const label = releaseStatusConfig[newStatus].label;

	const updateData: Record<string, unknown> = { status: newStatus };
	// Auto-set releasedAt when marking as released and none is set yet
	if (newStatus === "released" && !currentReleasedAt) {
		updateData.releasedAt = new Date();
	}

	return {
		field: "status",
		updateData,
		toastMessages: {
			loading: { title: "Updating status..." },
			success: { title: "Status updated", description: `Changed to ${label}` },
			error: { title: "Failed to update status" },
		},
	};
}
