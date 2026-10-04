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
import { updateAssigneesToTaskAction } from "@/lib/fetches/task";
import { useBoardAssignableUsers, useBoardCapabilities, useBoardItemActions } from "../core/board-data";
import { StaticField } from "./static-field";

interface FieldAssigneeProps {
	task: schema.TaskWithLabels;
}

export function FieldAssignee({ task }: FieldAssigneeProps) {
	const { canEditFields } = useBoardCapabilities();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { execute } = useBoardItemActions(task);
	const availableUsers = useBoardAssignableUsers(task.organizationId);
	const assigneeIds = task.assignees.map((assignee) => assignee.id);

	const avatarStack = task.assignees.slice(0, 3).map((assignee, index) => (
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
	));

	if (!canEditFields) {
		return task.assignees.length === 0 ? (
			<StaticField className="inline-flex size-5 items-center justify-center rounded-full border border-transparent bg-accent text-accent-foreground">
				<IconUserOff className="h-3 w-3 shrink-0" />
			</StaticField>
		) : (
			<StaticField className="flex items-center -space-x-2">{avatarStack}</StaticField>
		);
	}

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
						{avatarStack}
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
