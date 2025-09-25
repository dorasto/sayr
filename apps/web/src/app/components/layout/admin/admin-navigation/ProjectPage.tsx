"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import dynamic from "next/dynamic";

const CreateIssueDialog = dynamic(() => import("@/app/components/admin/organization/project/issue/creator"), {
	ssr: false,
});
const ProjectDropdown = dynamic(() => import("@/app/components/admin/organization/project/project-dropdown"), {
	ssr: false,
});

export default function ProjectPage() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: project, setValue: setProject } = useStateManagement<schema.projectType>("project", null, 1);
	const { value: tasks, setValue: setTasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: labels, setValue: setLabels } = useStateManagement<schema.labelType[]>("labels", [], 1);

	return (
		<>
			<CreateIssueDialog
				organization={organization}
				project={project}
				tasks={tasks}
				setTasks={setTasks}
				_labels={labels}
			/>
			<ProjectDropdown project={project} setProject={setProject} labels={labels} setLabels={setLabels} />
		</>
	);
}
