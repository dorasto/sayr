"use client";
import type { schema } from "@repo/database";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconPlus, IconSettings, IconSlash } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { TaskFilterDropdown } from "@/app/components/admin/global/project/task/filter/task-filter-dropdown";

const CreateIssueDialog = dynamic(() => import("@/app/components/admin/global/project/task/issue/creator"), {
	ssr: false,
});
const ProjectDropdown = dynamic(() => import("@/app/components/admin/global/project/project-dropdown"), {
	ssr: false,
});

export default function ProjectPage() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: project, setValue: setProject } = useStateManagement<schema.projectType>("project", null, 1);
	const { value: tasks, setValue: setTasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: labels, setValue: setLabels } = useStateManagement<schema.labelType[]>("labels", [], 1);
	const [openNew, setOpenNew] = useState(false);
	const [openProjectSettings, setOpenProjectSettings] = useState(false);

	// Extract users from organization members for filter dropdown
	const availableUsers = organization?.members.map((member) => member.user) || [];
	if (!organization || !project || !tasks) {
		return (
			<Skeleton className="flex items-center gap-2 shrink-0 rounded bg-accent border px-3 py-0.5 h-9 shadow-xs w-full justify-start" />
		);
	}
	return (
		<div className="flex items-center gap-3 w-full">
			<div className="flex items-center gap-2 shrink-0 rounded bg-accent border px-3 py-0.5 h-9 shadow-xs w-fit justify-start">
				<Breadcrumb>
					<BreadcrumbList className="">
						<BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization?.id}`}>{organization?.name}</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator>
							<IconSlash />
						</BreadcrumbSeparator>
						<BreadcrumbItem>
							<Button
								variant={"ghost"}
								size={"sm"}
								className="h-auto w-auto p-0 gap-1 items-center"
								onClick={() => setOpenProjectSettings(true)}
							>
								<IconSettings className="!size-4" /> {project?.name}
							</Button>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			{/* Task Filters */}
			{/* <TaskFilterDropdown tasks={tasks} labels={labels} availableUsers={availableUsers} /> */}

			<Button variant={"accent"} size={"sm"} className="h-9" onClick={() => setOpenNew(true)}>
				<IconPlus />
				<span className="text-inherit">New task</span>
			</Button>
			<CreateIssueDialog
				organization={organization}
				project={project}
				tasks={tasks}
				setTasks={setTasks}
				_labels={labels}
				open={openNew}
				setOpen={setOpenNew}
			/>
			<ProjectDropdown
				project={project}
				setProject={setProject}
				labels={labels}
				setLabels={setLabels}
				isOpen={openProjectSettings}
				setIsOpen={setOpenProjectSettings}
			/>
		</div>
	);
}
