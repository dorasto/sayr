"use client";

import type { schema } from "@repo/database";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";

export default function TaskPage() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: task } = useStateManagement<schema.TaskWithLabels>("_task_", null, 1);

	if (!organization || !task) {
		return <Skeleton className="h-7 w-full" />;
	}

	return (
		<div className="flex w-full flex-1 flex-wrap items-center shrink-0 gap-3 overflow-hidden">
			<div className="flex items-center gap-2 shrink py-0.5 h-9 shadow-xs w-fit justify-start">
				<Breadcrumb>
					<BreadcrumbList className="sm:gap-1 items-center">
						<BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization.id}`}>{organization.name}</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />

						<BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization.id}/tasks`}>Tasks</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>#{task.shortId}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</div>
	);
}
