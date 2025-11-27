"use client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconPlus, IconSettings, IconSlash, IconUsers } from "@tabler/icons-react";
import { ChevronDownIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

const CreateIssueDialog = dynamic(() => import("@/app/components/admin/global/org/tasks/task/creator"), {
	ssr: false,
});

export default function TasksPage() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: tasks, setValue: setTasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: labels } = useStateManagement<schema.labelType[]>("labels", [], 1);
	const [openNew, setOpenNew] = useState(false);
	if (!organization || !tasks) {
		return (
			<Skeleton className="flex items-center gap-2 shrink-0 rounded px-3 py-0.5 h-9 shadow-xs w-full justify-start bg-sidebar" />
		);
	}
	return (
		<div className="flex items-center gap-3 w-full">
			<div className="flex items-center gap-2 shrink-0 rounded-lg bg-accent h-9 shadow-xs w-fit justify-start overflow-hidden">
				<Breadcrumb className="h-full">
					<BreadcrumbList className="h-full gap-0">
						<BreadcrumbItem className="h-full">
							<BreadcrumbLink
								href={`/admin/${organization?.id}`}
								className="flex items-center gap-1 px-2 py-0.5 h-full"
							>
								<Avatar className="h-3.5 w-3.5">
									<AvatarImage src={organization.logo || ""} alt={organization.name} className="" />
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUsers className="h-3.5 w-3.5" />
									</AvatarFallback>
								</Avatar>
								{organization?.name}
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator className="h-full flex items-center">
							<IconSlash className="h-full" />
						</BreadcrumbSeparator>
						<BreadcrumbItem className="h-full">
							<DropdownMenu>
								<DropdownMenuTrigger
									asChild
									// className="flex items-center gap-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
								>
									<BreadcrumbPage className="flex items-center gap-1 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer hover:bg-border/80 h-full px-2 py-0.5">
										All tasks
										<ChevronDownIcon />
									</BreadcrumbPage>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem>Documentation</DropdownMenuItem>
									<DropdownMenuItem>Themes</DropdownMenuItem>
									<DropdownMenuItem>GitHub</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</BreadcrumbItem>
						{/* <BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization?.id}/tasks`}>All tasks</BreadcrumbLink>
						</BreadcrumbItem> */}
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			{/* Task Filters */}
			{/* <TaskFilterDropdown tasks={tasks} labels={labels} availableUsers={availableUsers} /> */}

			<Button variant={"accent"} size={"sm"} className="h-9 rounded-lg border-0" onClick={() => setOpenNew(true)}>
				<IconPlus />
				<span className="text-inherit">New task</span>
			</Button>
			<CreateIssueDialog
				organization={organization}
				tasks={tasks}
				setTasks={setTasks}
				_labels={labels}
				open={openNew}
				setOpen={setOpenNew}
			/>
		</div>
	);
}
