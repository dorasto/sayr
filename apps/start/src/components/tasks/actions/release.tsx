import type { schema } from "@repo/database";
import { IconRocket } from "@tabler/icons-react";
import type { FieldDisplay, FieldOption, SingleFieldUpdatePayload } from "./types";

/**
 * Builds the list of release options from the org's releases.
 * Includes a "No Release" option at the top.
 */
export function getReleaseOptions(releases: schema.releaseType[]): FieldOption<string | null>[] {
	const noneOption: FieldOption<string | null> = {
		id: "none",
		label: "No Release",
		icon: <IconRocket className="h-4 w-4 text-muted-foreground" />,
		value: null,
		keywords: "release none remove",
	};

	const relOptions: FieldOption<string | null>[] = releases.map((rel) => ({
		id: rel.id,
		label: rel.name,
		icon: rel.icon ? (
			<span className="text-sm shrink-0">{rel.icon}</span>
		) : (
			<IconRocket className="h-4 w-4 text-muted-foreground shrink-0" />
		),
		value: rel.id,
		keywords: `release ${rel.name}`,
	}));

	return [noneOption, ...relOptions];
}

export function getReleaseDisplay(
	task: schema.TaskWithLabels,
	releases: schema.releaseType[],
): FieldDisplay {
	const name = releases.find((r) => r.id === task.releaseId)?.name ?? "None";
	return {
		label: name,
		icon: <IconRocket className="h-4 w-4 opacity-60" />,
	};
}

export function getReleaseUpdatePayload(
	task: schema.TaskWithLabels,
	newReleaseId: string | null,
	releases: schema.releaseType[],
): SingleFieldUpdatePayload {
	const name = newReleaseId
		? (releases.find((r) => r.id === newReleaseId)?.name ?? "Unknown")
		: null;

	return {
		kind: "single",
		field: "release",
		updateData: { releaseId: newReleaseId },
		optimisticTask: { ...task, releaseId: newReleaseId },
		toastMessages: {
			loading: { title: newReleaseId ? "Updating release..." : "Removing release..." },
			success: {
				title: newReleaseId ? "Release updated" : "Release removed",
				description: name ? `Changed to ${name}` : undefined,
			},
			error: { title: "Failed to update release" },
		},
	};
}
