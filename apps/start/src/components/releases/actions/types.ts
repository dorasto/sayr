import type { ReactNode } from "react";

/**
 * Toast message triplet used by the release update hook.
 */
export interface ReleaseToastMessages {
	loading: { title: string; description?: string };
	success: { title: string; description?: string };
	error: { title: string; description?: string };
}

/**
 * A single selectable option for a release field (e.g. one status value).
 */
export interface ReleaseFieldOption {
	id: string;
	label: string;
	icon: ReactNode;
	value: string | null;
	keywords?: string;
}

/**
 * Payload for a release field update.
 */
export interface ReleaseFieldUpdatePayload {
	/** Key used for the toast action ID (e.g. "status", "targetDate"). */
	field: string;
	/** Data passed to `updateReleaseAction`. */
	updateData: Record<string, unknown>;
	/** Toast messages for this update. */
	toastMessages: ReleaseToastMessages;
}
