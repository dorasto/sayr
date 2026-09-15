import type { schema } from "@repo/database";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { IconRocket } from "@tabler/icons-react";
import { useLanderData } from "@/contexts/ContextLander";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldReleaseProps {
	task: schema.TaskWithLabels;
}

/**
 * Compact release pill — hidden entirely when the task has no release
 * (matches the existing org-scoped row's ReleaseBadgeButton, which also
 * renders null on empty). Still a full ComboBox trigger underneath, so
 * clicking it reassigns/clears the release.
 */
export function FieldRelease({ task }: FieldReleaseProps) {
	const { releases } = useLanderData();
	const { execute } = useBoardTaskFieldAction(task);
	const availableReleases = releases.filter((release) => release.organizationId === task.organizationId);
	const current = availableReleases.find((release) => release.id === task.releaseId);

	if (!current) return null;

	return (
		<ComboBox
			value={task.releaseId ?? undefined}
			onValueChange={(value) => {
				const releaseId = value || null;
				execute({
					kind: "single",
					field: "release",
					updateData: { releaseId },
					optimisticTask: { ...task, releaseId },
					toastMessages: {
						loading: { title: releaseId ? "Updating release..." : "Removing release..." },
						success: { title: releaseId ? "Release updated" : "Release removed" },
						error: { title: "Failed to update release" },
					},
				});
			}}
		>
			<ComboBoxTrigger asChild>
				<button
					type="button"
					data-no-propagate
					className="flex items-center gap-1 h-5 max-w-24 shrink-0 rounded-full bg-accent px-1.5 text-[11px] font-medium text-muted-foreground cursor-pointer"
					title={current.name}
				>
					<IconRocket className="size-2.5 shrink-0" style={{ color: current.color ?? undefined }} />
					<span className="truncate">{current.name}</span>
				</button>
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search releases..." />
				<ComboBoxList>
					<ComboBoxEmpty>No releases found.</ComboBoxEmpty>
					<ComboBoxGroup>
						<ComboBoxItem value="" searchValue="No release">
							No release
						</ComboBoxItem>
						{availableReleases.map((release) => (
							<ComboBoxItem key={release.id} value={release.id} searchValue={release.name}>
								<IconRocket className="h-4 w-4" style={{ color: release.color ?? undefined }} />
								<span>{release.name}</span>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}
