"use client";
import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import {
	IconAdjustmentsHorizontal,
	IconPlus,
	IconSettings,
	IconSlash,
	IconStack2,
	IconUser,
	IconUserCheck,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { TaskFilterDropdown } from "@/app/components/admin/global/project/task/filter/task-filter-dropdown";

const CreateIssueDialog = dynamic(() => import("@/app/components/admin/global/project/task/issue/creator"), {
	ssr: false,
});
const ProjectDropdown = dynamic(() => import("@/app/components/admin/global/project/project-dropdown"), {
	ssr: false,
});

export default function ProjectSide() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: project, setValue: setProject } = useStateManagement<schema.projectType>("project", null, 1);
	const { value: tasks, setValue: setTasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: labels, setValue: setLabels } = useStateManagement<schema.labelType[]>("labels", [], 1);
	const [openNew, setOpenNew] = useState(false);
	const [openProjectSettings, setOpenProjectSettings] = useState(false);

	// Extract users from organization members for filter dropdown
	const availableUsers = organization?.members.map((member) => member.user) || [];
	const { account } = useLayoutData();

	// Filter out done and canceled tasks to get open issues count
	const opentaskCount = tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length;
	const openusertaskCount = tasks.filter(
		(task) =>
			task.status !== "done" &&
			task.status !== "canceled" &&
			task.assignees.some((assignee) => assignee.id === account?.id)
	).length;

	if (!organization || !project || !tasks) {
		return (
			<Skeleton className="flex items-center gap-2 shrink-0 rounded bg-accent border px-3 py-0.5 h-9 w-full justify-start" />
		);
	}
	return (
		<div className="flex flex-col gap-3 w-full">
			<Tile className="bg-card md:w-full hover:bg-accent">
				<TileHeader>
					<TileIcon>
						<IconUser />
					</TileIcon>
					<TileTitle>{project?.name}</TileTitle>
				</TileHeader>
				<TileAction>
					<Button variant="ghost" size="icon" onClick={() => setOpenProjectSettings(true)}>
						<IconSettings />
					</Button>
				</TileAction>
			</Tile>
			<div className="flex flex-wrap gap-2 w-full">
				<Tile className="bg-card md:w-full max-w-40">
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon>
								<IconStack2 />
							</TileIcon>
							Open tasks
						</TileTitle>
						<TileDescription>{opentaskCount}</TileDescription>
					</TileHeader>
				</Tile>
				<Tile className="bg-card md:w-full max-w-40">
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon>
								<IconUser />
							</TileIcon>
							Your tasks
						</TileTitle>
						<TileDescription>{openusertaskCount}</TileDescription>
					</TileHeader>
				</Tile>
			</div>
			<Separator />
			<Tabs defaultValue="views" className="w-full bg-card">
				<TabsList className="justify-start bg-transparent px-0">
					<TabsTrigger asChild value="views">
						<Button
							variant={"accent"}
							className="data-[state=active]:bg-accent bg-card rounded-lg border-transparent"
							size={"sm"}
						>
							<IconStack2 className="w-4 h-4" />
							Views
						</Button>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="views" className="mt-0 p-1">
					<div className="flex flex-col gap-2 max-h-64 overflow-scroll">
						{/* Example tile, replace with actual views */}
						<Tile className="bg-accent md:w-full">
							<TileHeader>
								<TileTitle className="flex items-center gap-2">
									<TileIcon>
										<IconStack2 />
									</TileIcon>
									Default
								</TileTitle>
							</TileHeader>
						</Tile>
					</div>
				</TabsContent>
			</Tabs>
			{/* <div className="flex items-center gap-2 shrink-0 rounded bg-accent border px-3 py-0.5 shadow-xs w-full justify-start">
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
			</div> */}

			{/* Task Filters */}
			{/* <TaskFilterDropdown tasks={tasks} labels={labels} availableUsers={availableUsers} /> */}

			{/* <Button variant={"accent"} size={"sm"} className="h-9" onClick={() => setOpenNew(true)}>
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
			/> */}
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
