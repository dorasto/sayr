"use client";
import { useMatch } from "@tanstack/react-router";
import CreateIssueDialog from "@/components/tasks/task/creator";

export default function TasksPageActions() {
	// Use route matches to get data instead of context
	// This avoids the context provider requirement at the AdminNavigation level
	const orgMatch = useMatch({ from: "/(admin)/$orgId", shouldThrow: false });
	const tasksMatch = useMatch({
		from: "/(admin)/$orgId/tasks",
		shouldThrow: false,
	});

	const organization = orgMatch?.loaderData?.organization;
	const labels = orgMatch?.loaderData?.labels;
	const releases = orgMatch?.loaderData?.releases;
	const tasks = tasksMatch?.loaderData?.tasks;
	const issueTemplates = orgMatch?.loaderData?.issueTemplates;

	if (!organization || !labels || !tasks) return null;

	// Note: setTasks won't work here since we're not using the context
	// The dialog will need to handle task creation via server action/mutation
	return (
		<CreateIssueDialog
			organization={organization}
			tasks={tasks}
			setTasks={() => {}} // Tasks will be updated via websocket/revalidation
			_labels={labels}
			issueTemplates={issueTemplates ?? []}
			releases={releases ?? []}
		/>
	);
}
