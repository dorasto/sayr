import type { schema } from "@repo/database";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { IconRocket } from "@tabler/icons-react";
import { useLanderData } from "@/contexts/ContextLander";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldReleaseProps {
	task: schema.TaskWithLabels;
}

export function FieldRelease({ task }: FieldReleaseProps) {
	const { releases } = useLanderData();
	const { execute } = useBoardTaskFieldAction(task);
	const availableReleases = releases.filter((release) => release.organizationId === task.organizationId);
	const current = availableReleases.find((release) => release.id === task.releaseId);

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
			<ComboBoxTrigger className="w-auto gap-2">
				<ComboBoxValue>
					<IconRocket className="h-4 w-4 text-muted-foreground" />
					<span>{current?.name ?? "Release"}</span>
				</ComboBoxValue>
				<ComboBoxIcon />
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
