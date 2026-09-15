import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
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
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { getInitials } from "@repo/util";
import { IconUser } from "@tabler/icons-react";
import { useMemo } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { updateAssigneesToTaskAction } from "@/lib/fetches/task";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldAssigneeProps {
	task: schema.TaskWithLabels;
}

export function FieldAssignee({ task }: FieldAssigneeProps) {
	const { tasks } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { execute } = useBoardTaskFieldAction(task);
	const availableUsers = useMemo(() => {
		const users = new Map<string, schema.UserSummary>();
		for (const orgTask of tasks) {
			if (orgTask.organizationId !== task.organizationId) continue;
			for (const user of orgTask.assignees) {
				users.set(user.id, user);
			}
		}
		return Array.from(users.values());
	}, [task.organizationId, tasks]);
	const assigneeIds = task.assignees.map((assignee) => assignee.id);

	return (
		<ComboBox
			values={assigneeIds}
			onValuesChange={(values) => {
				const assignees = availableUsers.filter((user) => values.includes(user.id));
				execute({
					kind: "multi",
					actionId: "update-task-assignees",
					apiFn: () => updateAssigneesToTaskAction(task.organizationId, task.id, values, sseClientId),
					optimisticTask: { ...task, assignees },
					toastMessages: {
						loading: { title: "Updating assignees..." },
						success: { title: "Assignees updated" },
						error: { title: "Failed to update assignees" },
					},
				});
			}}
		>
			<ComboBoxTrigger className="w-auto gap-2">
				<ComboBoxValue>
					{task.assignees.length > 0 ? (
						<span className="flex -space-x-1.5">
							{task.assignees.slice(0, 3).map((assignee) => (
								<Avatar key={assignee.id} className="size-5 border border-background">
									<AvatarImage src={assignee.image ?? undefined} alt={assignee.name ?? "Assignee"} />
									<AvatarFallback>{getInitials(assignee.name)}</AvatarFallback>
								</Avatar>
							))}
						</span>
					) : (
						<IconUser className="h-4 w-4 text-muted-foreground" />
					)}
					<span>{task.assignees.length > 0 ? `${task.assignees.length} assignees` : "Assignee"}</span>
				</ComboBoxValue>
				<ComboBoxIcon />
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search assignees..." />
				<ComboBoxList>
					<ComboBoxEmpty>No assignees found.</ComboBoxEmpty>
					<ComboBoxGroup>
						{availableUsers.map((user) => (
							<ComboBoxItem key={user.id} value={user.id} searchValue={user.name ?? ""}>
								<Avatar className="size-6">
									<AvatarImage src={user.image ?? undefined} alt={user.name ?? "Assignee"} />
									<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
								</Avatar>
								<span>{user.name ?? "Unknown user"}</span>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}
