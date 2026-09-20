import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
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
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { getInitials } from "@repo/util";
import { IconUserOff } from "@tabler/icons-react";
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
			<ComboBoxTrigger asChild>
				{task.assignees.length === 0 ? (
					<Button type="button" variant="accent" size="icon" data-no-propagate className="size-5 rounded-full">
						<IconUserOff className="h-3 w-3 shrink-0" />
					</Button>
				) : (
					<button type="button" data-no-propagate className="flex items-center -space-x-2 cursor-pointer">
						{task.assignees.slice(0, 3).map((assignee, index) => (
							<Avatar
								key={assignee.id}
								className={cn("rounded-full h-5 w-5 border border-background", index > 0 && "relative")}
								style={{ zIndex: task.assignees.length - index }}
							>
								<AvatarImage src={assignee.image ?? undefined} alt={assignee.name ?? "Assignee"} />
								<AvatarFallback className="rounded-full bg-accent uppercase text-[10px]">
									{getInitials(assignee.name)}
								</AvatarFallback>
							</Avatar>
						))}
					</button>
				)}
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
