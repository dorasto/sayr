import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useCallback } from "react";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { updateReleaseAction } from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import type { ReleaseFieldUpdatePayload } from "./types";

/**
 * Shared hook that executes any ReleaseFieldUpdatePayload.
 *
 * Handles the API call via `runWithToast` and reconciles the response
 * back into state via the provided `setRelease` callback.
 *
 * When `release.id === "draft"`, API calls are skipped — useful for
 * creator dialogs that manage local state via `onChange` callbacks.
 */
export function useReleaseFieldAction(
	release: schema.releaseType | schema.ReleaseWithTasks,
	setRelease: (updater: (prev: schema.ReleaseWithTasks | null) => schema.ReleaseWithTasks | null) => void,
) {
	const { organization } = useLayoutOrganization();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { runWithToast } = useToastAction();

	const execute = useCallback(
		async (payload: ReleaseFieldUpdatePayload) => {
			// Skip API calls for draft/unsaved releases (creator dialog pattern).
			if (release.id === "draft") return;

			const data = await runWithToast(
				`update-release-${payload.field}`,
				payload.toastMessages,
				() => updateReleaseAction(organization.id, release.id, payload.updateData as Parameters<typeof updateReleaseAction>[2], sseClientId),
			);

			if (data?.success && data.data) {
				const updated = data.data;
				setRelease((prev) =>
					prev
						? {
								...prev,
								status: updated.status,
								targetDate: updated.targetDate,
								releasedAt: updated.releasedAt,
								name: updated.name,
								slug: updated.slug,
								color: updated.color,
								icon: updated.icon,
								description: updated.description,
							}
						: null,
				);
			}
		},
		[release.id, organization.id, sseClientId, runWithToast, setRelease],
	);

	return { execute };
}
