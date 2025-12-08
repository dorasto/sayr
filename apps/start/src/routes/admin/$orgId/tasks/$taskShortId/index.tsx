import { createFileRoute } from "@tanstack/react-router";
import { TaskContentMain } from "@/components/tasks/task/task-content";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";

export const Route = createFileRoute("/admin/$orgId/tasks/$taskShortId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { task } = useLayoutTask();
	const { organization, labels, categories } = useLayoutOrganization();

	const availableUsers =
		organization?.members.map((member) => member.user) || [];

	return (
		<TaskContentMain
			task={task}
			labels={labels}
			availableUsers={availableUsers}
			organization={organization}
			categories={categories}
		/>
	);
}
