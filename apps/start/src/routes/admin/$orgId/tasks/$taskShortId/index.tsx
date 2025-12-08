import { createFileRoute } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";
import { TaskContent } from "@/components/tasks/task/task-content";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";

export const Route = createFileRoute("/admin/$orgId/tasks/$taskShortId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { tasks, setTasks } = useLayoutTasks();
	const { task, setTask } = useLayoutTask();
	const { organization, labels, categories } = useLayoutOrganization();
	const { ws } = useLayoutData();

	const availableUsers =
		organization?.members.map((member) => member.user) || [];

	return (
		<TaskContent
			isDialog={false}
			open={true}
			onOpenChange={() => {}}
			task={task}
			labels={labels}
			tasks={tasks}
			setTasks={setTasks}
			setSelectedTask={(t) => t && setTask(t)}
			availableUsers={availableUsers}
			organization={organization}
			ws={ws}
			categories={categories}
		/>
	);
}
