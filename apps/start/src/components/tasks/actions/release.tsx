import type { schema } from "@repo/database";
import { IconRocket } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import type { FieldDisplay, FieldOption, SingleFieldUpdatePayload } from "./types";

export interface ReleaseOptionMeta {
	slug: string;
	status: string;
	color: string | null;
	icon: string | null;
}

/**
 * Builds the list of release options from the org's releases.
 * Includes a "No Release" option at the top.
 *
 * Each option's `metadata` carries the slug, status, and colour info
 * so that richer surfaces (context menus) can render badges without
 * re-querying the release array.
 */
export function getReleaseOptions(
	releases: schema.releaseType[],
): FieldOption<string | null, ReleaseOptionMeta | undefined>[] {
	const noneOption: FieldOption<string | null, ReleaseOptionMeta | undefined> = {
		id: "none",
		label: "No Release",
		icon: <IconRocket className="h-4 w-4 text-muted-foreground" />,
		value: null,
		keywords: "release none remove",
	};

	const relOptions: FieldOption<string | null, ReleaseOptionMeta | undefined>[] = releases.map((rel) => ({
		id: rel.id,
		label: rel.name,
		icon: rel.icon ? (
			<RenderIcon
				iconName={rel.icon}
				size={14}
				color={rel.color || undefined}
				raw
			/>
		) : (
			<IconRocket className="h-4 w-4 text-muted-foreground shrink-0" />
		),
		value: rel.id,
		keywords: `release ${rel.name} ${rel.slug || ""}`,
		metadata: {
			slug: rel.slug || "",
			status: rel.status,
			color: rel.color,
			icon: rel.icon,
		},
	}));

	return [noneOption, ...relOptions];
}

export function getReleaseDisplay(
	task: schema.TaskWithLabels,
	releases: schema.releaseType[],
): FieldDisplay {
	const rel = releases.find((r) => r.id === task.releaseId);
	return {
		label: rel?.name ?? "None",
		icon: rel?.icon ? (
			<RenderIcon
				iconName={rel.icon}
				size={14}
				color={rel.color || undefined}
				raw
			/>
		) : (
			<IconRocket className="h-4 w-4 opacity-60" />
		),
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
